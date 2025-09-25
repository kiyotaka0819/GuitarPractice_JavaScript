// ★★★ 必須: GASのURLは不要なので、空か削除してください ★★★
const GAS_API_URL = ''; 

// コード情報と進行情報（静的環境でJS内に保持するダミーデータ）
let CHORD_DATA_MAP = {
    'C': { displayName: 'C', fretPositions: [0, 3, 2, 0, 1, 0], lowFret: 0 },
    'G': { displayName: 'G', fretPositions: [3, 2, 0, 0, 0, 3], lowFret: 0 },
    'Am': { displayName: 'Am', fretPositions: [0, 0, 2, 2, 1, 0], lowFret: 0 },
    'F': { displayName: 'F', fretPositions: [1, 3, 3, 2, 1, 1], lowFret: 1 }, 
    'Bm': { displayName: 'Bm', fretPositions: [2, 2, 4, 4, 3, 2], lowFret: 2 },
    'F#m': { displayName: 'F#m', fretPositions: [2, 4, 4, 2, 2, 2], lowFret: 2 },
    // ローフレット値が3以上のコード (fretboard2.jpgテスト用)
    'G#m': { displayName: 'G#m', fretPositions: [4, 6, 6, 4, 4, 4], lowFret: 4 }, // 4フレットから始まるG#m
    'C#m': { displayName: 'C#m', fretPositions: [-1, 4, 6, 6, 5, 4], lowFret: 4 } // 4フレットから始まるC#m
};
let CHORD_PROGRESSIONS_MAP = {
    'C-G-Am-F': ['C', 'G', 'Am', 'F'],
    'TestHighFret': ['F#m', 'C#m', 'G#m', 'G'], 
    'Random': ['C', 'G', 'Am', 'F'] 
};

// 現在の練習状態
let currentProgressionName = 'C-G-Am-F'; 
let currentChordIndex = 0;
let totalProgressionLength = CHORD_PROGRESSIONS_MAP[currentProgressionName].length; 
let autoUpdateIntervalId = null; 

// DOM要素の取得
const fretboardContainer = document.getElementById('fretboard-container');
const nextFretboardContainer = document.getElementById('next-fretboard-container');
const currentChordDisplayNameElement = document.getElementById('current-chord-displayname');
const nextChordDisplayNameElement = document.getElementById('next-chord-displayname');
const progressionSelect = document.getElementById('progression-select');
const progressBar = document.getElementById('progress-bar');
const prevChordButton = document.getElementById('prev-chord-button');
const nextChordButton = document.getElementById('next-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const autoUpdateTimeSelect = document.getElementById('auto-update-time');
const errorContainer = document.getElementById('error-container'); 
const startProgressionButton = document.getElementById('start-progression-button');
const currentProgressionNameElement = document.getElementById('current-progression-name');

// ★★★ 修正: ギター弦のY座標とフレット線のX座標をパーセントで定義 (相対位置) ★★★
// (フレットボードの画像の高さ220px、幅240pxを基準とする)
const stringTopsPercent = [34, 42, 50, 57, 65, 72]; 
const fretLeftsPercent = [4, 23, 44, 64, 85, 98]; 


// ==============================================================================
// 1. データ取得と初期化
// ==============================================================================

/**
 * ページロード時の初期化
 */
async function initializeApp() {
    console.log("--- アプリ初期化開始 ---");

    populateProgressionSelect();

    // 初期表示コード情報の取得
    const initialChords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    const currentChordName = initialChords[currentChordIndex];
    const nextChordName = initialChords[(currentChordIndex + 1) % initialChords.length];
    
    const initialCurrentChordInfo = CHORD_DATA_MAP[currentChordName];
    const initialNextChordInfo = CHORD_DATA_MAP[nextChordName];

    console.log(`初期コード進行: ${currentProgressionName}. 現在: ${currentChordName}, 次: ${nextChordName}. 全長: ${totalProgressionLength}`);

    // DOM要素の存在チェックと初期表示
    if (initialCurrentChordInfo && currentChordDisplayNameElement) {
        // 進行状況を結合する
        let currentDisplayText = initialCurrentChordInfo.displayName;
        currentDisplayText += " (" + (currentChordIndex + 1) + "/" + totalProgressionLength + ")";
        currentChordDisplayNameElement.innerText = currentDisplayText;
        
        drawFretboardDots(initialCurrentChordInfo, fretboardContainer);
    } else if (currentChordDisplayNameElement) {
        currentChordDisplayNameElement.innerText = "コードなし";
    }

    if (initialNextChordInfo && nextChordDisplayNameElement) {
        nextChordDisplayNameElement.innerText = initialNextChordInfo.displayName;
        drawFretboardDots(initialNextChordInfo, nextFretboardContainer);
    } else if (nextChordDisplayNameElement) {
        nextChordDisplayNameElement.innerText = "なし";
        nextFretboardContainer.innerHTML = '';
        nextFretboardContainer.style.backgroundImage = "none";
    }
    
    updateProgressBar();
    setupEventListeners(); 
    
    // 初期化時にも進行名と状況を表示する
    if (currentProgressionNameElement) {
        currentProgressionNameElement.innerText = currentProgressionName + " (1 / " + totalProgressionLength + ")";
    }
    
    console.log("--- アプリ初期化完了 ---");
}

/**
 * プルダウンメニューにコード進行を追加
 */
function populateProgressionSelect() {
    if (!progressionSelect) return;
    
    progressionSelect.innerHTML = '';
    for (const name in CHORD_PROGRESSIONS_MAP) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = (name === 'Random') ? 'ランダム進行' : name;
        progressionSelect.appendChild(option);
    }
    progressionSelect.value = currentProgressionName;
}


// ==============================================================================
// 2. 表示更新ロジック (位相ロジック込み)
// ==============================================================================

/**
 * 押弦情報を元にフレットボードを描画
 */
function drawFretboardDots(chordInfo, containerElement) {
    if (!containerElement) return;

    console.log(`[DRAW] 描画開始: コード ${chordInfo.displayName}, LowFret: ${chordInfo.lowFret}`);

    if (!chordInfo || !chordInfo.fretPositions || chordInfo.fretPositions.length !== 6) {
        console.warn("[DRAW] 無効なコード情報: 描画をスキップ");
        containerElement.innerHTML = '';
        containerElement.style.backgroundImage = "none";
        return;
    }

    containerElement.innerHTML = ''; // ドットクリア

    const lowFretValue = chordInfo.lowFret || 0;
    
    // 背景画像の設定 (fretboard2.jpgの切り替えロジック)
    containerElement.style.backgroundImage = lowFretValue > 2 ? "url('fretboard2.jpg')" : "url('fretboard.jpg')";

    // ローフレット値表示
    if (lowFretValue > 2) {
        const lowFretDiv = document.createElement('div');
        lowFretDiv.className = 'fret-label'; 
        lowFretDiv.textContent = lowFretValue;

        // ★★★ 修正箇所: あんたの新しいパーセント値に更新 (80%, 22%) ★★★
        lowFretDiv.style.position = 'absolute';
        lowFretDiv.style.top = '80%'; 
        lowFretDiv.style.left = '22%'; 
        lowFretDiv.style.transform = 'translate(-50%, -50%)'; 
        
        containerElement.appendChild(lowFretDiv);
        console.log(`[DRAW] ローフレット表示: ${lowFretValue} @ (${lowFretDiv.style.left}, ${lowFretDiv.style.top})`);
    }

    // 各弦にドット、ミュート、開放弦インジケーター描画 
    chordInfo.fretPositions.forEach((fret, i) => {
        const stringIndex = (chordInfo.fretPositions.length - 1) - i; // 6弦(i=0) -> index=5, 1弦(i=5) -> index=0

        const element = document.createElement('div');
        element.style.position = 'absolute';
        
        // Y座標をパーセントに切り替え
        element.style.top = stringTopsPercent[stringIndex] + '%'; 

        let displayFret = fret;
        if (lowFretValue > 2) {
            displayFret = fret - (lowFretValue - 1);
        }
        
        let logMessage = `[DOT] 弦${6-i} (RawFret: ${fret}, DisplayFret: ${displayFret}, Y-Top: ${element.style.top})`;

        if (fret === -1) { // ミュート弦
            element.className = 'mute-mark'; 
            element.innerText = '×';
            // X座標をパーセントに切り替え
            element.style.left = fretLeftsPercent[0] + '%';
            logMessage += ` -> MUTE (X-Left: ${element.style.left})`;
        } else if (fret === 0) { // 開放弦
            element.className = 'open-mark'; 
            element.innerText = '●'; 
            // X座標をパーセントに切り替え
            element.style.left = fretLeftsPercent[0] + '%';
            logMessage += ` -> OPEN (X-Left: ${element.style.left})`;
        } else if (fret > 0) { // 押弦フレット
            element.className = 'dot';
            
            // ドット位置配置
            if (displayFret >= 1 && displayFret < fretLeftsPercent.length) {
                // X座標をパーセントに切り替え
                element.style.left = fretLeftsPercent[displayFret] + '%';
                logMessage += ` -> DOT (Fret ${displayFret}, X-Left: ${element.style.left})`;
            } else if (displayFret === 0) {
                 element.style.left = fretLeftsPercent[0] + '%';
                 logMessage += ` -> DOT-ERROR-FRET0 (X-Left: ${element.style.left})`; 
            } else {
                console.warn(`[DOT] 描画スキップ: 弦${6-i}のDisplayFret値が範囲外 (${displayFret})`);
                return;
            }
        }
        console.log(logMessage);
        element.style.transform = 'translate(-50%, -50%)'; 
        containerElement.appendChild(element);
    });
}


/**
 * プログレスバー表示更新
 */
function updateProgressBar() {
    if (totalProgressionLength > 0 && progressBar) {
        const progress = ((currentChordIndex + 1) / totalProgressionLength) * 100;
        progressBar.style.width = progress + '%';
        progressBar.textContent = (currentChordIndex + 1) + '/' + totalProgressionLength;
    } else if (progressBar) {
        progressBar.style.width = '0%';
        progressBar.textContent = '0/0';
    }
}

/**
 * 表示全体を更新（進行変更時やボタン押下時）
 */
function updateDisplay() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) return;

    const currentChordName = chords[currentChordIndex];
    const nextChordIndex = (currentChordIndex + 1) % chords.length; 
    const nextChordName = chords[nextChordIndex];
    
    const currentChordInfo = CHORD_DATA_MAP[currentChordName];
    const nextChordInfo = CHORD_DATA_MAP[nextChordName];

    console.log(`[UPDATE] 表示更新。現在: ${currentChordName} (${currentChordIndex + 1}/${totalProgressionLength}), 次: ${nextChordName}`);
    
    // コード名と進行状況更新
    let currentDisplayText = currentChordInfo.displayName;
    currentDisplayText += " (" + (currentChordIndex + 1) + "/" + totalProgressionLength + ")";
    
    if (currentChordDisplayNameElement) currentChordDisplayNameElement.innerText = currentDisplayText;
    drawFretboardDots(currentChordInfo, fretboardContainer);

    // 次のコード名とフレットボード更新
    if (nextChordInfo && nextChordDisplayNameElement) {
        nextChordDisplayNameElement.innerText = nextChordInfo.displayName;
        drawFretboardDots(nextChordInfo, nextFretboardContainer);
    } else if (nextChordDisplayNameElement) {
        nextChordDisplayNameElement.innerText = "なし";
        nextFretboardContainer.innerHTML = '';
        nextFretboardContainer.style.backgroundImage = "none";
    }
    
    updateProgressBar();
    
    // 進行状況と進行名を中央のH2タグに表示
    if (currentProgressionNameElement) {
        currentProgressionNameElement.innerText = currentProgressionName + " (" + (currentChordIndex + 1) + " / " + totalProgressionLength + ")";
    }
}

// ==============================================================================
// 3. 進行操作ロジック (静的環境用)
// ==============================================================================

/**
 * 静的環境でコード進行のインデックスを操作し、表示を更新
 */
function navigateProgression(direction, newProgressionName = null) {
    
    console.log(`[NAV] 進行操作: Action=${direction}, NewProgression=${newProgressionName}`);

    // 進行初期化 ('init'アクションとプルダウン変更に対応)
    if (newProgressionName) {
        currentProgressionName = newProgressionName;
        currentChordIndex = 0;
        
        if (currentProgressionName === 'Random') {
            // ランダム進行生成ロジック (ここではダミー。本実装時はここにロジックが必要)
            CHORD_PROGRESSIONS_MAP['Random'] = ['G', 'C', 'F', 'Am'];
            console.log("[NAV] ランダム進行を生成しました (ダミー)");
        }
    }
    
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) return;
    
    totalProgressionLength = chords.length; // 進行の長さを更新
    
    if (direction === 'next') {
        currentChordIndex = (currentChordIndex + 1) % chords.length;
    } else if (direction === 'prev') {
        if (currentChordIndex > 0) {
            currentChordIndex--;
        } else {
            // 最初のコードで「前へ」を押したら最後のコードへループ (任意)
            currentChordIndex = chords.length - 1; 
        }
    }
    
    console.log(`[NAV] 進行ステータス更新: Index=${currentChordIndex}, Length=${totalProgressionLength}`);
    updateDisplay(); // 新しい進行情報で表示を更新
}


// ==============================================================================
// 4. イベントリスナーと自動更新
// ==============================================================================

/**
 * 自動更新開始
 */
function startAutoUpdate() {
    console.log("[AUTO] 自動更新開始");
    if (autoUpdateIntervalId !== null) {
        clearInterval(autoUpdateIntervalId);
    }
    const interval = parseInt(autoUpdateTimeSelect.value, 10);
    autoUpdateIntervalId = setInterval(() => {
        navigateProgression('next'); // navigateProgressionを呼ぶ
    }, interval);
    if (toggleAutoUpdateButton) toggleAutoUpdateButton.textContent = '停止';
}

/**
 * 自動更新停止
 */
function stopAutoUpdate() {
    if (autoUpdateIntervalId !== null) {
        console.log("[AUTO] 自動更新停止");
        clearInterval(autoUpdateIntervalId);
        autoUpdateIntervalId = null;
        if (toggleAutoUpdateButton) toggleAutoUpdateButton.textContent = '再生';
    }
}

/**
 * 自動更新切り替え (再生/停止)
 */
function toggleAutoUpdate() {
    if (autoUpdateIntervalId === null) {
        startAutoUpdate();
    } else {
        stopAutoUpdate();
    }
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // Prev/Nextボタンは navigateProgression を直接呼ぶ
    if (prevChordButton) {
        prevChordButton.addEventListener('click', function() {
            stopAutoUpdate(); // 自動更新を停止
            navigateProgression('prev'); 
        });
    }

    if (nextChordButton) {
        nextChordButton.addEventListener('click', function() {
            stopAutoUpdate(); // 自動更新を停止
            navigateProgression('next'); 
        });
    }

    if (randomProgressionButton) {
        randomProgressionButton.addEventListener('click', function() {
            stopAutoUpdate();
            if (progressionSelect) progressionSelect.value = 'Random';
            navigateProgression('init', 'Random'); 
        });
    }
    
    // 'この進行で開始'ボタンのイベントリスナー設定 (initializeProgressionの代替)
    if (startProgressionButton) {
        startProgressionButton.addEventListener('click', function() {
            stopAutoUpdate();
            const selectedProgression = progressionSelect.value;
            navigateProgression('init', selectedProgression); 
        });
    }

    // コード進行選択フォームのイベントをJSで乗っ取る
    const progressionForm = document.getElementById('progressionForm');
    if (progressionForm) {
        progressionForm.addEventListener('submit', function(e) {
            e.preventDefault(); // フォームの送信をキャンセル
            stopAutoUpdate();
            const selectedProgression = progressionSelect.value;
            navigateProgression('init', selectedProgression);
        });
    }

    // 自動更新イベントリスナー設定
    if (toggleAutoUpdateButton) {
        toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);
    }
    
    // プルダウン変更時、自動更新中なら停止後新しい間隔で再開
    if (autoUpdateTimeSelect) {
        autoUpdateTimeSelect.addEventListener('change', function() {
            if (autoUpdateIntervalId !== null) {
                stopAutoUpdate();
                startAutoUpdate(); 
            }
        });
    }
}


// DOM読み込み完了後実行
document.addEventListener('DOMContentLoaded', initializeApp);