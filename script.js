// ★★★ 必須: GASのURLは不要なので、空か削除してください ★★★
const GAS_API_URL = ''; 

// コード情報と進行情報（静的環境でJS内に保持するダミーデータ）
// 開発を進める際は、このCHORD_DATA_MAPとCHORD_PROGRESSIONS_MAPに、
// 全てのコードデータと進行データを手動で記述する必要があります。
let CHORD_DATA_MAP = {
    'C': { displayName: 'C', fretPositions: [0, 3, 2, 0, 1, 0], lowFret: 0 },
    'G': { displayName: 'G', fretPositions: [3, 2, 0, 0, 0, 3], lowFret: 0 },
    'Am': { displayName: 'Am', fretPositions: [0, 0, 2, 2, 1, 0], lowFret: 0 },
    'F': { displayName: 'F', fretPositions: [1, 3, 3, 2, 1, 1], lowFret: 1 }
};
let CHORD_PROGRESSIONS_MAP = {
    'C-G-Am-F': ['C', 'G', 'Am', 'F'],
    // ランダム進行用に、初期化時にこのキーを使う
    'Random': ['C', 'G', 'Am', 'F'] 
};

// 現在の練習状態
let currentProgressionName = 'C-G-Am-F'; 
let currentChordIndex = 0;
let totalProgressionLength = CHORD_PROGRESSIONS_MAP[currentProgressionName].length; // 進行の長さを初期化
let autoUpdateIntervalId = null; 

// DOM要素の取得
const fretboardContainer = document.getElementById('fretboard-container');
const nextFretboardContainer = document.getElementById('next-fretboard-container');
const currentChordDisplayNameElement = document.getElementById('currentChordDisplayName'); 
const nextChordDisplayNameElement = document.getElementById('nextChordDisplayName'); 
const progressionSelect = document.getElementById('progressionSelect'); 
const progressBar = document.getElementById('progressBar'); 
const prevChordButton = document.getElementById('prevChordButton'); 
const nextChordButton = document.getElementById('nextChordButton'); 
const randomProgressionButton = document.getElementById('randomProgressionButton'); 
const toggleAutoUpdateButton = document.getElementById('toggleAutoUpdate'); 
const autoUpdateTimeSelect = document.getElementById('autoUpdateTime'); 
const errorContainer = document.getElementById('error-container'); // エラー表示用

// ★★★ 復元された絶対座標定数（正しい位相を決定するピクセル値）★★★
// 弦ごとのY座標 (1弦から6弦)
const stringTops = [75, 92, 109, 126, 143, 158];
// フレットごとのX座標 (0フレットから4フレット)
const fretLefts = [10, 55, 105, 153, 203, 235];
// ★★★ 復元ここまで ★★★


// ==============================================================================
// 1. データ取得と初期化
// ==============================================================================

/**
 * ページロード時の初期化
 */
async function initializeApp() {
    // JSPのように初期データが既にロードされていると想定し、表示を更新
    
    // 初期表示コード情報の取得 (CHORD_DATA_MAPのキーが存在しない場合はダミーでCとGを使う)
    const initialChords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    const currentChordName = initialChords[currentChordIndex];
    const nextChordName = initialChords[(currentChordIndex + 1) % initialChords.length];
    
    const initialCurrentChordInfo = CHORD_DATA_MAP[currentChordName];
    const initialNextChordInfo = CHORD_DATA_MAP[nextChordName];

    // DOM要素の存在チェックと初期表示
    if (initialCurrentChordInfo && currentChordDisplayNameElement) {
        currentChordDisplayNameElement.innerText = initialCurrentChordInfo.displayName + " (" + (currentChordIndex + 1) + "/" + totalProgressionLength + ")";
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
    
    // 進行選択プルダウンの更新 (JSPの表示ロジックを部分的に再現)
    populateProgressionSelect();

    updateProgressBar();
    setupEventListeners(); 
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
        // JSPのロジック: 'Random'は「ランダム進行」と表示
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

    if (!chordInfo || !chordInfo.fretPositions || chordInfo.fretPositions.length !== 6) {
        containerElement.innerHTML = '';
        containerElement.style.backgroundImage = "none";
        return;
    }

    containerElement.innerHTML = ''; // ドットクリア

    const lowFretValue = chordInfo.lowFret || 0;
    
    // 背景画像の設定 (404エラー対策: ファイル名と拡張子を正確に確認)
    // ファイル名が fretboard.jpg と fretboard2.jpg であることを前提とします。
    containerElement.style.backgroundImage = lowFretValue > 2 ? "url('fretboard2.jpg')" : "url('fretboard.jpg')";
    containerElement.style.backgroundSize = 'contain';

    // ローフレット値が2より大きい場合、フレット番号表示
    if (lowFretValue > 2) {
        const lowFretDiv = document.createElement('div');
        lowFretDiv.className = 'low-fret-display';
        lowFretDiv.textContent = lowFretValue;

        const lowestStringY = stringTops[stringTops.length - 1];
        lowFretDiv.style.position = 'absolute';
        lowFretDiv.style.top = (lowestStringY + 20) + 'px';
        lowFretDiv.style.left = (fretLefts[0] + 35) + 'px';
        containerElement.appendChild(lowFretDiv);
    }

    // 各弦にドット、ミュート、開放弦インジケーター描画 (絶対座標で位相を確定)
    chordInfo.fretPositions.forEach((fret, i) => {
        const stringIndex = (chordInfo.fretPositions.length - 1) - i; // 6弦(i=0) -> index=5, 1弦(i=5) -> index=0

        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = stringTops[stringIndex] + 'px'; // Y座標をピクセルで設定
        element.style.transform = 'translate(-50%, -50%)'; // CSSのtransformを継承

        if (fret === -1) { // ミュート弦
            element.className = 'mute';
            element.innerText = '×';
            element.style.left = fretLefts[0] + 'px'; // ナットの上
        } else if (fret === 0) { // 開放弦
            element.className = 'open';
            element.innerText = '●';
            element.style.left = fretLefts[0] + 'px'; // ナットの上
        } else if (fret > 0) { // 押弦フレット
            element.className = 'dot';
            let displayFret = fret;
            
            // ローフレット適用時、表示フレット位置調整
            if (lowFretValue > 2) {
                displayFret = fret - (lowFretValue - 1);
            }
            
            // ドット位置配置
            if (displayFret >= 1 && displayFret < fretLefts.length) {
                element.style.left = fretLefts[displayFret] + 'px';
            } else if (displayFret === 0) {
                 element.style.left = fretLefts[0] + 'px';
            } else {
                return;
            }
        }
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
}

// ==============================================================================
// 3. 進行操作ロジック (静的環境用)
// ==============================================================================

/**
 * 静的環境でコード進行のインデックスを操作し、表示を更新
 * (元のJSPのsendAjaxRequestの役割を担う)
 */
function navigateProgression(direction, newProgressionName = null) {
    
    // 進行初期化 ('init'アクションとプルダウン変更に対応)
    if (newProgressionName) {
        currentProgressionName = newProgressionName;
        currentChordIndex = 0;
        
        if (currentProgressionName === 'Random') {
            // ランダム進行生成ロジック (ここではダミー。本実装時はここにロジックが必要)
            CHORD_PROGRESSIONS_MAP['Random'] = ['C', 'F', 'Am', 'G'];
        }
    }
    
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) return;
    
    totalProgressionLength = chords.length; // 進行の長さを更新
    
    if (direction === 'next') {
        // 進行の最後までいったら、最初に戻ってループ
        currentChordIndex = (currentChordIndex + 1) % chords.length;
    } else if (direction === 'prev') {
        // 進行の最初で「前へ」を押したら、何もせず終了
        if (currentChordIndex > 0) {
            currentChordIndex--;
        }
    }
    
    updateDisplay(); // 新しい進行情報で表示を更新
}


// ==============================================================================
// 4. イベントリスナーと自動更新
// ==============================================================================

/**
 * 自動更新開始
 */
function startAutoUpdate() {
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
    
    // コード進行選択ボタンのイベントをJSで乗っ取る
    const progressionForm = document.querySelector('form[action$="/chordChange"]');
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