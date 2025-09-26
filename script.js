// index.js の最終確定版（多段リスト表示対応）

// ★★★ GASのURLは、必ずあなたのデプロイURLに更新すること！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1I7sOC37M1RR6aAAqfJoQCVi7KTGtQk4Z13s6cGplpF28kf88H4vKNVvDIzudeqbA/exec'; 

const chordDisplay = document.getElementById('chordDisplay');
const progressionTitle = document.getElementById('progressionTitle');
const prevChordBtn = document.getElementById('prevChordBtn');
const nextChordBtn = document.getElementById('nextChordBtn');
const modeToggleButton = document.getElementById('modeToggleButton');

// 状態管理変数
let allData = null;
let currentProgression = ['C', 'G', 'Am', 'F']; // デフォルト進行
let currentChordIndex = 0;
let currentMode = 'detailed'; // ★★★ 追加: 'detailed' (詳細/2個) または 'list' (多段/全部)

// エラー/ステータスメッセージ表示関数
function showStatus(message, isError) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = isError ? 'error' : '';
    statusMessage.style.display = 'block';
    if (!isError) {
        setTimeout(() => { statusMessage.style.display = 'none'; }, 3000);
    }
}

// GASから全データを取得する処理 (JSONP)
function loadData() {
    return new Promise((resolve, reject) => {
        const callbackName = 'gasIndexCallback_' + Date.now();
        const url = `${GAS_URL}?callback=${callbackName}`; 

        const timeoutId = setTimeout(() => {
            reject(new Error("GASからの応答がタイムアウトしました。"));
        }, 10000);

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

// フレットボードを描画するヘルパー関数
function drawFretboard(chordName, chordInfo) {
    // 押さえ方がない場合は、コード名のみ表示
    if (!chordInfo || !chordInfo.fretPositions) {
        return `<div class="fretboard-container"><h2>${chordName}</h2><p>押さえ方データなし</p></div>`;
    }

    const { lowFret, fretPositions } = chordInfo;
    
    // フレットボードの描画ロジック（簡略化）
    // -1: ミュート(X), 0: 開放(O), 1以上: 押さえるフレット
    const stringLabels = ['6', '5', '4', '3', '2', '1'];
    let dotsHtml = '';

    // 押さえ方情報を文字列で表示（簡略化）
    const fretStr = fretPositions.map(f => {
        if (f === -1) return 'X';
        if (f === 0) return 'O';
        return f;
    }).join(' ');

    // 実際にSVGやCanvasでフレットボードを描くロジックは省略し、文字列で代用
    return `
        <div class="fretboard-container">
            <h2>${chordName}</h2>
            <div class="fretboard">
                <p style="margin: 0; font-size: 0.9em;">Lo Fret: ${lowFret}</p>
                <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 1.2em;">${fretStr}</p>
                <p style="margin-top: 5px; font-size: 0.8em;">(6 5 4 3 2 1)</p>
                </div>
        </div>
    `;
}

// ★★★ 描画関数 (モード分岐) ★★★
function updateDisplay() {
    if (!allData) return;
    
    chordDisplay.innerHTML = ''; // 一旦クリア
    
    // 画面全体に list モード用のクラスを付与/削除
    document.getElementById('container').classList.toggle('compact-mode', currentMode === 'list');
    
    // 現在のコード進行名を表示
    const progressionName = Object.keys(allData.progressions).find(key => allData.progressions[key].join(',') === currentProgression.join(',')) || 'カスタム進行';
    progressionTitle.textContent = `${progressionName} (全${currentProgression.length}コード)`;

    if (currentMode === 'detailed') {
        // 詳細モード: 現在のコードと次のコードの2個だけ表示
        renderDetailedView();
        modeToggleButton.textContent = '▶ 全て表示に切り替え';
    } else {
        // 多段リストモード: 進行の全コードを並べて表示
        renderListView();
        modeToggleButton.textContent = '▶ 1コード表示に切り替え';
    }
    
    // ボタンの状態更新
    prevChordBtn.disabled = currentChordIndex === 0;
    nextChordBtn.disabled = currentChordIndex >= currentProgression.length - 1;
}

// 詳細モードの描画 (現在のコードと次のコードの2個)
function renderDetailedView() {
    const currentChordName = currentProgression[currentChordIndex];
    const nextChordName = currentProgression[currentChordIndex + 1];

    // 現在のコード
    chordDisplay.innerHTML += drawFretboard(currentChordName, allData.chords[currentChordName]);

    // 次のコード (あれば)
    if (nextChordName) {
        chordDisplay.innerHTML += drawFretboard(`次: ${nextChordName}`, allData.chords[nextChordName]);
    }
}

// ★★★ 多段リストモードの描画 (全てのコードを並べる) ★★★
function renderListView() {
    currentProgression.forEach((chordName, index) => {
        const chordInfo = allData.chords[chordName];
        let html = drawFretboard(chordName, chordInfo);
        
        // 現在のコードに印を付ける (CSSで装飾)
        if (index === currentChordIndex) {
            html = html.replace('fretboard-container', 'fretboard-container current-chord');
        }
        
        chordDisplay.innerHTML += html;
    });
}
// ★★★ 描画関数ここまで ★★★


// イベントリスナー
prevChordBtn.addEventListener('click', () => {
    if (currentChordIndex > 0) {
        currentChordIndex--;
        updateDisplay();
    }
});

nextChordBtn.addEventListener('click', () => {
    if (currentChordIndex < currentProgression.length - 1) {
        currentChordIndex++;
        updateDisplay();
    }
});

// ★★★ モード切り替え関数 ★★★
function toggleDisplayMode() {
    // モードを切り替え
    currentMode = (currentMode === 'detailed') ? 'list' : 'detailed';
    updateDisplay(); // 表示を更新
}

// 初期ロード処理
document.addEventListener('DOMContentLoaded', () => {
    loadData()
        .then(data => {
            allData = data;
            // データから最初のコード進行を選択
            const progressionKeys = Object.keys(data.progressions);
            if (progressionKeys.length > 0) {
                currentProgression = data.progressions[progressionKeys[0]];
                currentChordIndex = 0;
            } else {
                showStatus("コード進行データが見つかりませんでした。追加画面から登録してください。", true);
            }
            updateDisplay();
        })
        .catch(error => {
            console.error("データ取得エラー:", error);
            showStatus(`データ取得エラー: ${error.message}`, true);
        });
});