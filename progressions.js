// progressions.js の最終確定版（再読み込みボタン対応）

// ★★★ GASのURLは、必ずあなたのデプロイURLに更新すること！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1I7sOC37M1RR6aAAqfJoQCVi7KTGtQk4Z13s6cGplpF28kf88H4vKNVvDIzudeqbA/exec'; 

const progressionsList = document.getElementById('progressionsList');
const statusMessage = document.getElementById('statusMessage');

// GASからデータを取得する処理 (JSONP)
function loadData() {
    return new Promise((resolve, reject) => {
        const callbackName = 'gasProgressionsCallback_' + Date.now();
        const url = `${GAS_URL}?callback=${callbackName}`; 

        // タイムアウトを設定
        const timeoutId = setTimeout(() => {
            reject(new Error("サーバーからの応答がタイムアウトしました。"));
        }, 10000); // 10秒でタイムアウト

        // コールバック関数をグローバルに定義
        window[callbackName] = (result) => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            script.remove();

            if (result && result.chords && result.progressions) {
                resolve(result);
            } else if (result && result.error) {
                reject(new Error(result.message || "サーバー側でエラーが発生しました。"));
            } else {
                reject(new Error("不正なデータ形式です。"));
            }
        };

        // スクリプトタグを動的に挿入してJSONPを実行
        const script = document.createElement('script');
        script.src = url; 
        
        script.onerror = () => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            script.remove();
            reject(new Error("通信エラーによりデータを取得できませんでした。"));
        };
        
        document.head.appendChild(script);
    });
}

// 取得したデータをHTMLに描画する処理
function displayProgressions(progressions, chords) {
    if (Object.keys(progressions).length === 0) {
        progressionsList.innerHTML = '<p style="text-align: center;">登録されたコード進行がありません。</p>';
        return;
    }

    let html = '';
    
    // コード進行のデータ(progressions)をループ
    for (const name in progressions) {
        const progressionChords = progressions[name];
        
        let chordBoxes = '';
        
        // 進行を構成する個々のコードをループ
        progressionChords.forEach(chordName => {
            chordBoxes += `<div class="chord-box">${chordName}</div>`;
        });
        
        html += `
            <div class="progression-item">
                <div class="progression-name">${name}</div>
                <div class="progression-chords">${chordBoxes}</div>
            </div>
        `;
    }

    progressionsList.innerHTML = html;
}

function showStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'error' : '';
    statusMessage.style.display = 'block';
    if (!isError) {
        // 成功メッセージは表示しない（リスト更新で十分）
        statusMessage.style.display = 'none';
    }
}


// ★★★ この関数が、ボタンクリックとページロードの両方から呼ばれる ★★★
function loadProgressions() {
    progressionsList.innerHTML = '<p style="text-align: center;">データを読み込み中です...</p>';
    showStatus("", false); // メッセージをクリア

    loadData()
        .then(data => {
            displayProgressions(data.progressions, data.chords);
            // 成功メッセージは出さず、リスト更新で完了とする
        })
        .catch(error => {
            console.error("データ取得エラー:", error);
            progressionsList.innerHTML = '<p style="text-align: center;">データの取得に失敗しました。</p>';
            showStatus(`エラー: ${error.message}`, true);
        });
}


// ページロード時に一度だけ実行する
document.addEventListener('DOMContentLoaded', loadProgressions);