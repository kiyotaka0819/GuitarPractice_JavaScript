// ★★★ 必須: ここにGASのデプロイURLを貼り付ける！ ★★★
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbylBTT1V-B7Dgpw_ZgF7PJ4C0myzlM-ovo9mqTfnpEJ7EGnRQpcwo2-D1E4lLzGGsDn/exec';

// コード情報と進行情報（サーバーから取得後に更新される）
let CHORD_DATA_MAP = {};
let CHORD_PROGRESSIONS_MAP = {};

// 現在の練習状態
let currentProgressionName = 'C-G-Am-F'; // デフォルト値を設定
let currentChordIndex = 0;
let totalProgressionLength = 4; // ★★★ 修正: totalProgressionLengthの定義と初期化 ★★★
let autoUpdateIntervalId = null; // 自動更新のインターバルID

// DOM要素の取得（IDはindex.htmlの最終修正版と完全に一致させる）
const fretboardContainer = document.getElementById('fretboard-container');
const nextFretboardContainer = document.getElementById('next-fretboard-container');
const currentChordDisplayNameElement = document.getElementById('currentChordDisplayName'); // 元のID名
const nextChordDisplayNameElement = document.getElementById('nextChordDisplayName'); // 元のID名
const progressionSelect = document.getElementById('progressionSelect'); // 元のID名
const currentProgressionNameElement = document.getElementById('current-progression-name'); // クラッシュ対策で残したID
const progressBar = document.getElementById('progressBar'); // 元のID名
const prevChordButton = document.getElementById('prevChordButton'); // 元のID名
const nextChordButton = document.getElementById('nextChordButton'); // 元のID名
const randomProgressionButton = document.getElementById('randomProgressionButton'); // 元のID名
const toggleAutoUpdateButton = document.getElementById('toggleAutoUpdate'); // 元のID名
const autoUpdateTimeSelect = document.getElementById('autoUpdateTime'); // 元のID名
const errorContainer = document.getElementById('error-container'); // エラー表示用

// ★★★ 復元された絶対座標定数（JSPから移植）★★★
// 弦ごとのY座標 (1弦から6弦)
const stringTops = [75, 92, 109, 126, 143, 158];
// フレットごとのX座標 (0フレットから4フレット)
const fretLefts = [10, 55, 105, 153, 203, 235];
// ★★★ 復元ここまで ★★★


// ==============================================================================
// 1. データ取得と初期化
// ==============================================================================

/**
 * GASからコードと進行データを取得する (静的な環境では使用しない)
 */
async function fetchChordData() {
    return {
        chords: CHORD_DATA_MAP,
        progressions: CHORD_PROGRESSIONS_MAP
    };
}

/**
 * ページロード時の初期化 (JSPの初期表示ロジックを再現)
 */
async function initializeApp() {
    // データ初期化 (GitHub Pagesでは本来 JSONなどでデータを読み込む必要がある)
    // ここでは初期表示用のダミーデータを仮定
    const initialCurrentChordInfo = { displayName: 'C', fretPositions: [0, 3, 2, 0, 1, 0], lowFret: 0 }; 
    const initialNextChordInfo = { displayName: 'G', fretPositions: [3, 2, 0, 0, 0, 3], lowFret: 0 };
    
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
    
    updateProgressBar(); // ★★★ 修正: コメントアウトを解除し、プログレスバーを初期更新 ★★★
    setupEventListeners(); 
}

// ==============================================================================
// 2. 表示更新ロジック
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
    
    // 背景画像の設定（元のJSPロジックを再現。画像ファイル名はindex.htmlと同じ階層に配置が必要）
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

    // 各弦にドット、ミュート、開放弦インジケーター描画
    chordInfo.fretPositions.forEach((fret, i) => {
        const stringIndex = (chordInfo.fretPositions.length - 1) - i; // 6弦(i=0) -> index=5, 1弦(i=5) -> index=0

        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.top = stringTops[stringIndex] + 'px'; // Y座標をピクセルで設定
        element.style.transform = 'translate(-50%, -50%)';

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
 * プログレスバー表示更新 (JSPのロジックを移植)
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


// ==============================================================================
// 3. イベントリスナーと自動更新 (JSPのロジックを移植)
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
        if (nextChordButton) nextChordButton.click(); 
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
 * Ajaxリクエストを送信する関数 (静的環境ではダミー)
 */
function sendAjaxRequest(action, newProgressionName = null) {
    console.warn("sendAjaxRequestは静的環境では動作しません。進行変更は手動で実装が必要です。");
    // 静的環境では、本来この関数内で currentChordIndex や CHORD_DATA_MAP を変更するロジックが必要です。
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    if (prevChordButton) {
        prevChordButton.addEventListener('click', function() {
            sendAjaxRequest('prev'); 
        });
    }

    if (nextChordButton) {
        nextChordButton.addEventListener('click', function() {
            sendAjaxRequest('next');
        });
    }

    if (randomProgressionButton) {
        randomProgressionButton.addEventListener('click', function() {
            if (progressionSelect) progressionSelect.value = 'Random';
            sendAjaxRequest('init', 'Random');
        });
    }

    if (toggleAutoUpdateButton) {
        toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);
    }
    
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