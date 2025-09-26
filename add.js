// add.js

// index.htmlと同じGASのURLを使う (ただし今度はPOST用として使う)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwvU2tqK8MHU3ferlvXzfS8lX4tFyrVQukg_RbC-51c8JCu7rlTQRgJQLRbAQGrBUQPBg/exec'; 

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

// データ送信関数 (フォームのデータをGASにPOST送信する)
async function sendDataToGAS(data, endpoint) {
    try {
        // GASでは特殊なフォームデータ形式でPOSTする必要がある
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }

        // fetchでPOSTリクエストを送信
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: formData 
        });

        // GASはリダイレクト応答を返すことが多いので、OK以外でもレスポンスボディを確認
        const result = await response.json();

        if (result.status === 'success') {
            showStatus(result.message || `${endpoint}の登録に成功しました！`, true);
            return true;
        } else {
            throw new Error(result.message || 'GAS側で処理エラーが発生しました。');
        }

    } catch (error) {
        console.error("データ送信エラー:", error);
        showStatus(`エラー: ${error.message}`, false);
        return false;
    }
}

// 1. 単一コードの登録処理
addChordForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    // フォームからデータを取得
    const chordName = document.getElementById('chordName').value.trim();
    const lowFret = parseInt(document.getElementById('lowFret').value);
    
    // 弦のデータを配列で取得
    const fretInputs = document.querySelectorAll('#fretPositions input');
    const fretPositions = Array.from(fretInputs).map(input => parseInt(input.value));
    
    // 送信用データを作成 (type: chordとしてGAS側で判別する)
    const data = {
        type: 'chord', 
        chordName: chordName,
        lowFret: lowFret,
        fretPositions: fretPositions.join(',') // GASに送るためにカンマ区切り文字列にする
    };
    
    await sendDataToGAS(data, 'コード');
});


// 2. コード進行の登録処理
addProgressionForm.addEventListener('submit', async (e) => {
    e.preventDefault(); 
    
    const progressionName = document.getElementById('progressionName').value.trim();
    const progressionChords = document.getElementById('progressionChords').value.trim();

    // 送信用データを作成 (type: progressionとしてGAS側で判別する)
    const data = {
        type: 'progression', 
        progressionName: progressionName,
        progressionChords: progressionChords // GASに送るためにそのまま文字列で送る
    };
    
    await sendDataToGAS(data, 'コード進行');
});