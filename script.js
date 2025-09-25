// ★★★ 必須: ここにGASのデプロイURLを貼り付ける！ ★★★
const GAS_API_URL = 'GASのURLをここに貼り付けてね';

// コード情報と進行情報（サーバーから取得後に更新される）
let CHORD_DATA_MAP = {};
let CHORD_PROGRESSIONS_MAP = {};

// 現在の練習状態
let currentProgressionName = 'C-G-Am-F'; // デフォルト値を設定
let currentChordIndex = 0;
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
 * GASからコードと進行データを取得する (静的な環境ではこの関数は使用しないが、フレームワークを残す)
 */
async function fetchChordData() {
    // 静的HTML/JSではGAS APIは使用できないため、ダミーデータを返すか、外部から読み込む
    // ここでは、JSPのように初期データが既に読み込まれていると想定し、空のまま残す
    
    // JSP版のコードでは、この関数は存在せず、データは<script>タグ内で直接パースされていた
    // 互換性のため、この関数は処理しないが、initializeAppを直接書き換える

    // GitHub Pages版でデータを読み込むなら、ここに fetch('chords.json') などの処理が必要になる。
    return {
        chords: CHORD_DATA_MAP,
        progressions: CHORD_PROGRESSIONS_MAP
    };
}

/**
 * ページロード時の初期化 (JSPの初期表示ロジックを再現)
 */
async function initializeApp() {
    // JSPでサーバーから渡されていた初期値を取得
    // GitHub Pages環境ではこれらの変数は未定義なので、ダミー値を設定
    const initialCurrentChordInfo = CHORD_DATA_MAP['C'] || { displayName: 'C', fretPositions: [0, 3, 2, 0, 1, 0], lowFret: 0 }; 
    const initialNextChordInfo = CHORD_DATA_MAP['G'] || { displayName: 'G', fretPositions: [3, 2, 0, 0, 0, 3], lowFret: 0 };
    
    // JSPから移行した際に、全データ取得ロジックが変更されているため、この部分の互換性が課題
    // 今回は表示ロジックのみに集中し、データ自体は外部から読み込む想定で残す
    
    // DOM要素の存在チェック（JSPの初期化ロジックから簡略化）
    if (initialCurrentChordInfo) {
        currentChordDisplayNameElement.innerText = initialCurrentChordInfo.displayName + " (" + (currentChordIndex + 1) + "/" + totalProgressionLength + ")";
        drawFretboardDots(initialCurrentChordInfo, fretboardContainer);
    } else {
        currentChordDisplayNameElement.innerText = "コードなし";
    }

    if (initialNextChordInfo) {
        nextChordDisplayNameElement.innerText = initialNextChordInfo.displayName;
        drawFretboardDots(initialNextChordInfo, nextFretboardContainer);
    } else {
        nextFretboardContainer.innerHTML = '';
        nextFretboardContainer.style.backgroundImage = "none";
    }
    
    // 注意: totalProgressionLength, CHORD_DATA_MAPなどが未定義のため、クラッシュする可能性あり。
    // GitHub Pages版では、これらをグローバル変数として定義するか、JSONファイルから読み込む必要があります。
    // ここでは、一旦元のJSPロジックを参考に、静的なHTML環境に合うように一部簡略化します。
    
    // JSPのロジックでは、サーバー側で設定された初期値を使っていた
    // ここでは、そのロジックを再現するため、仮の初期値でプログレスバーを更新
    // updateProgressBar(); // 実行すると未定義でクラッシュするためコメントアウト
    
    // イベントリスナーの設定はDOMContentLoaded直下から移動
    setupEventListeners(); 
}

// ==============================================================================
// 2. 表示更新ロジック
// ==============================================================================

/**
 * 押弦情報を元にフレットボードを描画
 * ★★★ 元のJSPロジックで完全に置き換え ★★★
 */
function drawFretboardDots(chordInfo, containerElement) {
    if (!containerElement) return;

    // 元コードのチェックロジックを復元
    if (!chordInfo || !chordInfo.fretPositions || chordInfo.fretPositions.length !== 6) {
        containerElement.innerHTML = '';
        containerElement.style.backgroundImage = "none";
        return;
    }

    containerElement.innerHTML = ''; // ドットクリア

    // ローフレット値で背景画像切り替え (元のJSPコードより簡略化)
    const lowFretValue = chordInfo.lowFret || 0;
    // JSPのロジック: lowFretValue > 2 ? "/fretboard2.jpg" : "/fretboard.jpg"
    // GitHub Pagesではパスを調整。元のCSSの定義と画像ファイル名に合わせて調整してください。
    containerElement.style.backgroundImage = lowFretValue > 2 ? "url('fretboard2.jpg')" : "url('fretboard.jpg')";
    containerElement.style.backgroundSize = 'contain';

    // ローフレット値が2より大きい場合、フレット番号表示
    if (lowFretValue > 2) {
        const lowFretDiv = document.createElement('div');
        lowFretDiv.className = 'low-fret-display'; // 元のCSSのクラス名を使用
        lowFretDiv.textContent = lowFretValue;

        // ローフレット番号位置設定 (元のJSPコードのロジックを復元)
        const lowestStringY = stringTops[stringTops.length - 1];
        lowFretDiv.style.position = 'absolute'; // CSSで設定されていない可能性を考慮
        lowFretDiv.style.top = (lowestStringY + 20) + 'px';
        lowFretDiv.style.left = (fretLefts[0] + 35) + 'px';
        containerElement.appendChild(lowFretDiv);
    }

    // 各弦にドット、ミュート、開放弦インジケーター描画 (元のJSPコードのロジックを復元)
    chordInfo.fretPositions.forEach((fret, i) => {
        // 6弦(i=0)のデータに対して、stringTopsの6弦(index 5)を使う
        const stringIndex = (chordInfo.fretPositions.length - 1) - i; // i=0(6弦) -> index=5, i=5(1弦) -> index=0

        const element = document.createElement('div');
        element.style.position = 'absolute'; // CSSで設定されていない可能性を考慮
        element.style.top = stringTops[stringIndex] + 'px'; // Y座標をピクセルで設定
        element.style.transform = 'translate(-50%, -50%)'; // CSSの.dot, .mute, .openのtransformを継承

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
            
            // ドット位置配置 (元のJSPコードのロジックを復元)
            if (displayFret >= 1 && displayFret < fretLefts.length) {
                element.style.left = fretLefts[displayFret] + 'px';
            } else if (displayFret === 0) {
                 // 押弦フレットでフレット0は起こらないが、元のロジックを維持
                 element.style.left = fretLefts[0] + 'px';
            } else {
                return; // 範囲外は描画しない
            }
        }
        containerElement.appendChild(element);
    });
}


/**
 * プログレスバー表示更新 (JSPのロジックを移植)
 */
function updateProgressBar() {
    // 静的環境では totalProgressionLength が未定義の可能性があるため、チェック
    const totalProgressionLength = 4; // 仮の値
    const currentChordIndex = 0; // 仮の値
    
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
        // JSPのロジック: 「次のコード」クリックシミュレート
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
 * Ajaxリクエストを送信する関数 (GitHub Pagesでは機能しないため、ダミーとして残す)
 */
function sendAjaxRequest(action, newProgressionName = null) {
    console.warn("sendAjaxRequestは静的環境では動作しません。ダミーデータを使用します。");
    // ここに静的環境用のコード進行変更ロジックを実装する必要があります。
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // ボタンクリックイベントリスナー設定
    if (prevChordButton) {
        prevChordButton.addEventListener('click', function() {
            sendAjaxRequest('prev'); // JSP/Servletとの連携が必要
        });
    }

    if (nextChordButton) {
        nextChordButton.addEventListener('click', function() {
            sendAjaxRequest('next'); // JSP/Servletとの連携が必要
        });
    }

    if (randomProgressionButton) {
        randomProgressionButton.addEventListener('click', function() {
            if (progressionSelect) progressionSelect.value = 'Random';
            sendAjaxRequest('init', 'Random'); // JSP/Servletとの連携が必要
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