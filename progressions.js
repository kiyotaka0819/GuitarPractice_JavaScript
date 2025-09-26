// progressions.js の最終確定版（Compact Mode対応）

// ★★★ GASのURLは、必ずあなたのデプロイURLに更新すること！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1I7sOC37M1RR6aAAqfJoQCVi7KTGtQk4Z13s6cGplpF28kf88H4vKNVvDIzudeqbA/exec'; 

const progressionsList = document.getElementById('progressionsList');
const statusMessage = document.getElementById('statusMessage');
let currentMode = 'detailed'; // 初期モードは詳細表示 (detailed)

// GASからデータを取得する処理 (JSONP)
function loadData() {
    return new Promise((resolve, reject) => {
        const callbackName = 'gasProgressionsCallback_' + Date.now();
        // データの読み込みのみなので、typeパラメータは不要
        const url = `${GAS_URL}?callback=${callbackName}`; 

        const timeoutId = setTimeout(() => {
            reject(new Error("GASからの応答がタイムアウトしました。"));
        }, 10000); // 10秒でタイムアウト

        window[callbackName] = (result) => {
            clearTimeout(timeoutId);
            delete window[callbackName];
            script.remove();

            if (result && result.chords && result.progressions) {
                resolve(result);
            } else if (result && result.error) {
                reject(new Error(result.message || "GAS側でエラーが発生しました。"));
            } else {
                reject(new Error("不正なデータ形式です。"));
            }
        };

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

// 取得したデータをHTMLに描画する処理（モード分岐）
function displayProgressions(progressions, chords) {
    if (Object.keys(progressions).length === 0) {
        progressionsList.innerHTML = '<p style="text-align: center;">登録されたコード進行がありません。</p>';
        return;
    }
    
    // モードによって描画関数を分岐
    if (currentMode === 'detailed') {
        renderDetailedMode(progressions);
        document.getElementById('modeToggleButton').textContent = '▶ コンパクト表示に切り替え';
    } else {
        renderCompactMode(progressions, chords);
        document.getElementById('modeToggleButton').textContent = '▶ 詳細表示に切り替え';
    }
}

// 既存の「詳細表示モード」の描画ロジック
function renderDetailedMode(progressions) {
    let html = '';
    
    for (const name in progressions) {
        const progressionChords = progressions[name];
        
        let chordBoxes = '';
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

// ★★★ 新しく追加する「コンパクト表示モード」の描画ロジック ★★★
function renderCompactMode(progressions, chords) {
    let html = '';
    
    // コード進行のデータ(progressions)をループ
    for (const name in progressions) {
        const progressionChords = progressions[name];
        
        let tableRows = '';
        
        // 進行を構成する個々のコードをループし、押さえ方を検索
        progressionChords.forEach(chordName => {
            const chordInfo = chords[chordName]; // 押さえ方情報を取得
            let fretPos = 'データなし';
            
            if (chordInfo) {
                // 押さえ方: (6弦, 5弦, ..., 1弦) - LoFret: X の形式で表示
                const frets = chordInfo.fretPositions.join(', ');
                const lowFret = chordInfo.lowFret;
                fretPos = `(${frets}) - LoFret: ${lowFret}`;
            }
            
            tableRows += `
                <tr>
                    <td>${chordName}</td>
                    <td class="fret-pos">${fretPos}</td>
                </tr>
            `;
        });
        
        html += `
            <div class="progression-item">
                <div class="progression-name">${name}</div>
                <table class="compact-table">
                    <thead>
                        <tr>
                            <th style="width: 30%;">コード名</th>
                            <th style="width: 70%;">押さえ方 (6弦 → 1弦)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
    }
    progressionsList.innerHTML = html;
}
// ★★★ コンパクト表示ロジックここまで ★★★


function showStatus(message, isError) {
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'error' : '';
    statusMessage.style.display = 'block';
    if (!isError) {
        statusMessage.style.display = 'none';
    }
}


// ★★★ モード切り替えボタンが押された時に呼ばれる関数 ★★★
function toggleDisplayMode() {
    // モードを切り替え
    currentMode = (currentMode === 'detailed') ? 'compact' : 'detailed';
    // データを再読み込みせずに、現在のデータで描画のみやり直す
    
    // データの再取得は不要なので、表示関数のみを呼び出す
    loadProgressions(false); // 引数(false)でデータ取得をスキップする想定に変更
}


// データをロードし、描画するメイン関数
function loadProgressions(forceLoad = true) {
    // 既にデータがロードされていて、かつ強制ロードではない場合は描画のみ実行
    if (!forceLoad && window.lastLoadedData) {
        displayProgressions(window.lastLoadedData.progressions, window.lastLoadedData.chords);
        return;
    }
    
    progressionsList.innerHTML = '<p style="text-align: center;">データを読み込み中です...</p>';
    showStatus("", false); 

    loadData()
        .then(data => {
            window.lastLoadedData = data; // データをグローバル変数にキャッシュ
            displayProgressions(data.progressions, data.chords);
        })
        .catch(error => {
            console.error("データ取得エラー:", error);
            progressionsList.innerHTML = '<p style="text-align: center;">データの取得に失敗しました。</p>';
            showStatus(`エラー: ${error.message}`, true);
        });
}


// ページロード時に一度だけ実行する
document.addEventListener('DOMContentLoaded', () => loadProgressions(true));