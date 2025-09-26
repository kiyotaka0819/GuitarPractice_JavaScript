// add.js の最終確定版（GET/JSONPで書き込みを実現）

// ★★★ ここを必ずあなたのGASデプロイURLに更新すること！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1I7sOC37M1RR6aAAqfJoQCVi7KTGtQk4Z13s6cGplpF28kf88H4vKNVvDIzudeqbA/exec'; 

const addChordForm = document.getElementById('addChordForm');
const addProgressionForm = document.getElementById('addProgressionForm');
const statusMessage = document.getElementById('statusMessage');

// メッセージ表示関数
function showStatus(message, isSuccess) {
    statusMessage.textContent = message;
    statusMessage.className = isSuccess ? 'success' : 'error';
    statusMessage.style.display = 'block';
    // 3秒後にメッセージを消す
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// データ送信関数 (データをURLに乗せてGETリクエストとして送信する JSONP)
async function sendDataToGAS(data, endpoint, typeOfAdd) {
    // 1. データをURLクエリパラメータ形式に変換
    const allData = {
        type: 'add', // GASで書き込み処理だと判断させるフラグ
        type_of_add: typeOfAdd, // どちらのフォームからのデータかをGASに伝える
        ...data
    };
    
    // URLSearchParamsを使うと、URLエンコードしてくれるから安心や
    const params = new URLSearchParams(allData).toString();
    
    // 2. コールバック名を設定
    const callbackName = 'gasAddCallback_' + Date.now();
    
    // 3. GETリクエストのURLを作成 (JSONP)
    const url = `${GAS_URL}?callback=${callbackName}&${params}`; 

    statusMessage.textContent = `${endpoint}を送信中...`;
    statusMessage.className = '';
    statusMessage.style.display = 'block';

    return new Promise((resolve, reject) => {
        // GASからの応答を処理するコールバック関数をグローバルに定義
        window[callbackName] = (result) => {
            delete window[callbackName];
            script.remove();

            if (result.status === 'success') {
                showStatus(result.message || `${endpoint}の登録に成功しました！`, true);
                resolve(true);
            } else {
                // GAS側でエラーが起きても、JSONPで返ってくる
                showStatus(`エラー: ${result.message}`, false);
                reject(new Error(result.message));
            }
        };

        // スクリプトタグを動的に挿入してJSONPを実行
        const script = document.createElement('script');
        script.src = url; 
        
        script.onerror = () => {
            delete window[callbackName];
            script.remove();
            showStatus(`エラー: ${endpoint}の通信に失敗しました。`, false);
            reject(new Error("通信エラー"));
        };
        
        document.head.appendChild(script);
    });
}

// 1. 単一コードの登録処理
addChordForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const chordName = document.getElementById('chordName').value.trim();
    const lowFret = document.getElementById('lowFret').value;
    
    // 弦のデータは、name属性を使って直接取得する (GAS側でe.parameterで受け取る値と合わせる)
    const fretInputs = document.querySelectorAll('#fretPositions input');
    const data = {
        chordName: chordName,
        lowFret: lowFret,
        fret6: fretInputs[0].value,
        fret5: fretInputs[1].value,
        fret4: fretInputs[2].value,
        fret3: fretInputs[3].value,
        fret2: fretInputs[4].value,
        fret1: fretInputs[5].value
    };
    
    await sendDataToGAS(data, 'コード', 'chord');
});


// 2. コード進行の登録処理
addProgressionForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const progressionName = document.getElementById('progressionName').value.trim();
    const progressionChords = document.getElementById('progressionChords').value.trim();

    const data = {
        progressionName: progressionName,
        progressionChords: progressionChords 
    };
    
    await sendDataToGAS(data, 'コード進行', 'progression');
});