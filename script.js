// script.js の最終確定版（機能復元 ＆ 多段リスト表示対応）

// ★★★ GASのURLは、必ずあなたのデプロイURLに更新すること！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1I7sOC37M1RR6aAAqfJoQCVi7KTGtQk4Z13s6cGplpF28kf88H4vKNVvDIzudeqbA/exec'; 

const chordDisplay = document.getElementById('chordDisplay');
const progressionTitle = document.getElementById('progressionTitle');
const progressionSelect = document.getElementById('progressionSelect');

const prevChordBtn = document.getElementById('prevChordBtn');
const nextChordBtn = document.getElementById('nextChordBtn');
const modeToggleButton = document.getElementById('modeToggleButton'); 

// 状態管理変数
let allData = null;
let currentProgression = []; 
let currentChordIndex = 0;
let currentMode = 'detailed'; // 'detailed' (詳細/2個) または 'list' (多段/全部)

// ... (showStatus, loadData 関数は省略。前回のものが有効です) ...

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


// ★★★ 機能を復元：フレットボードのSVGを描画する関数 ★★★
function drawFretboard(chordName, chordInfo, isCurrent) {
    if (!chordInfo || !chordInfo.fretPositions) {
        return `<div class="fretboard-container ${isCurrent ? 'current-chord' : ''}"><h2>${chordName}</h2><p>押さえ方データなし</p></div>`;
    }

    const { lowFret, fretPositions } = chordInfo;
    const isListMode = (currentMode === 'list');

    // SVGのサイズと設定
    const FRET_COUNT = 5;
    const STRING_COUNT = 6;
    const SVG_WIDTH = isListMode ? 100 : 200;
    const SVG_HEIGHT = isListMode ? 130 : 250; 
    const FRET_SPACING = SVG_HEIGHT / FRET_COUNT;
    const STRING_SPACING = SVG_WIDTH / (STRING_COUNT + 1);
    const DOT_RADIUS = isListMode ? 4 : 8;
    const START_FRET = lowFret > 1 ? lowFret : 1; 

    let svgContent = '';

    // 1. ナット/フレットラインの描画
    // ナット（太線）：lowFretが1の場合のみ描画
    const nutLine = lowFret === 1 ? `<line x1="${STRING_SPACING}" y1="0" x2="${SVG_WIDTH - STRING_SPACING}" y2="0" stroke="black" stroke-width="3"/>` : '';
    svgContent += nutLine;

    // フレット線
    for (let i = 1; i <= FRET_COUNT; i++) {
        const y = i * FRET_SPACING;
        svgContent += `<line x1="${STRING_SPACING}" y1="${y}" x2="${SVG_WIDTH - STRING_SPACING}" y2="${y}" stroke="black" stroke-width="1"/>`;
    }

    // 弦線
    for (let i = 0; i < STRING_COUNT; i++) {
        const x = (i + 1) * STRING_SPACING;
        svgContent += `<line x1="${x}" y1="0" x2="${x}" y2="${SVG_HEIGHT}" stroke="black" stroke-width="1"/>`;
    }
    
    // フレット番号の表示 (lowFretが1より大きい場合)
    const fretNumberDisplay = lowFret > 1 ? `<text x="${SVG_WIDTH - (isListMode ? 5 : 10)}" y="${FRET_SPACING * 1.5}" font-size="${isListMode ? 10 : 14}px" fill="#777" text-anchor="end">${lowFret}</text>` : '';
    svgContent += fretNumberDisplay;


    // 2. ドット（押さえ）とミュート/開放の描画
    // 6弦から1弦の順に処理
    for (let string = 0; string < STRING_COUNT; string++) {
        const fret = fretPositions[string]; // 6弦がインデックス0
        const x = (STRING_COUNT - string) * STRING_SPACING; // 6弦(左)から1弦(右)へ

        if (fret === -1) {
            // ミュート (X)
            svgContent += `<text x="${x}" y="${-2}" font-size="${isListMode ? 12 : 16}px" fill="black" text-anchor="middle">X</text>`;
        } else if (fret === 0) {
            // 開放弦 (O)
            svgContent += `<circle cx="${x}" cy="${-5}" r="${DOT_RADIUS * 0.7}" stroke="black" stroke-width="1" fill="white"/>`;
        } else if (fret >= START_FRET && fret < START_FRET + FRET_COUNT) {
            // 押さえるドット
            const y = (fret - START_FRET) * FRET_SPACING + FRET_SPACING / 2;
            svgContent += `<circle cx="${x}" cy="${y}" r="${DOT_RADIUS}" fill="black"/>`;
        }
        // 他のフレットは、この簡略図では表示しない
    }


    // HTML構造に戻す
    return `
        <div class="fretboard-container ${isCurrent ? 'current-chord' : ''}">
            <h2>${chordName}</h2>
            <div class="fretboard-svg-container">
                <svg width="100%" height="100%" viewBox="0 -10 ${SVG_WIDTH} ${SVG_HEIGHT + 10}">
                    ${svgContent}
                </svg>
            </div>
        </div>
    `;
}
// ★★★ SVG描画関数ここまで ★★★


// 描画関数 (モード分岐)
function updateDisplay() {
    if (!allData || currentProgression.length === 0) {
        progressionTitle.textContent = '進行が選択されていません';
        chordDisplay.innerHTML = '<p style="text-align: center; width: 100%;">コード進行一覧から進行を選んでください。</p>';
        return;
    }
    
    chordDisplay.innerHTML = ''; 
    
    // CSSクラスでレイアウトを切り替え
    document.getElementById('container').classList.toggle('compact-mode', currentMode === 'list');
    
    // 進行名の表示
    const progressionName = progressionSelect.options[progressionSelect.selectedIndex].text;
    progressionTitle.textContent = `${progressionName} (全${currentProgression.length}コード)`;

    if (currentMode === 'detailed') {
        renderDetailedView();
        modeToggleButton.textContent = '▶ 全て表示に切り替え';
        
        // 詳細モードでは、進む/戻るボタンを表示
        prevChordBtn.style.display = 'block';
        nextChordBtn.style.display = 'block';

    } else {
        renderListView();
        modeToggleButton.textContent = '▶ 2コード表示に切り替え';
        
        // 全て表示モードでは、進む/戻るボタンを非表示
        // ただし、インデックスは現在位置を示すために維持する
        prevChordBtn.style.display = 'none'; 
        nextChordBtn.style.display = 'none';
    }
    
    // ボタンの状態更新（詳細モードの時のみ意味がある）
    prevChordBtn.disabled = currentChordIndex === 0;
    nextChordBtn.disabled = currentChordIndex >= currentProgression.length - 1;
}

// 詳細モードの描画 (現在のコードと次のコードの2個)
function renderDetailedView() {
    const currentChordName = currentProgression[currentChordIndex];
    const nextChordName = currentProgression[currentChordIndex + 1];

    chordDisplay.innerHTML += drawFretboard(currentChordName, allData.chords[currentChordName], true);

    if (nextChordName) {
        chordDisplay.innerHTML += drawFretboard(`次: ${nextChordName}`, allData.chords[nextChordName], false);
    }
}

// 多段リストモードの描画 (全てのコードを並べる)
function renderListView() {
    currentProgression.forEach((chordName, index) => {
        const chordInfo = allData.chords[chordName];
        const isCurrent = (index === currentChordIndex); 
        
        chordDisplay.innerHTML += drawFretboard(chordName, chordInfo, isCurrent);
    });
}

// ★★★ 進行選択ドロップダウンの構築 ★★★
function setupProgressionSelect(progressions) {
    progressionSelect.innerHTML = ''; // 一旦クリア
    
    const keys = Object.keys(progressions);
    
    if (keys.length === 0) {
        progressionSelect.innerHTML = '<option value="">-- 進行なし --</option>';
        return;
    }

    keys.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        progressionSelect.appendChild(option);
    });

    // 初期進行を設定
    const firstProgressionName = keys[0];
    currentProgression = progressions[firstProgressionName];
    currentChordIndex = 0;
    progressionSelect.value = firstProgressionName;
}

// イベントリスナー
progressionSelect.addEventListener('change', (e) => {
    const name = e.target.value;
    if (allData && allData.progressions[name]) {
        currentProgression = allData.progressions[name];
        currentChordIndex = 0; // 進行が変わったら最初に戻る
        // 詳細モードで表示
        currentMode = 'detailed'; 
        updateDisplay();
    }
});

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

function toggleDisplayMode() {
    currentMode = (currentMode === 'detailed') ? 'list' : 'detailed';
    updateDisplay(); 
}

// 初期ロード処理
document.addEventListener('DOMContentLoaded', () => {
    loadData()
        .then(data => {
            allData = data;
            // 進行選択UIの構築
            setupProgressionSelect(data.progressions);
            updateDisplay();
        })
        .catch(error => {
            console.error("データ取得エラー:", error);
            showStatus(`データ取得エラー: ${error.message}`, true);
        });
});