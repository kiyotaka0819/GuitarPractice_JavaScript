// script.js の全文

// =====================================================================
// ★★★ GAS連携とグローバル変数 ★★★
// =====================================================================


const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbzu51ECxpRFnlz8d-0MDM1KxqedqtXTpGB2skVbYvsnD6OWjvMs_NwYPk_uc5-DzLbWCg/exec'; 

// グローバル変数
let CHORD_DATA_MAP = {}; 
let CHORD_PROGRESSIONS_MAP = {}; 
let currentProgressionName = 'Random'; // 初期進行名

// 自動更新用の変数
let autoUpdateIntervalId = null; 
let currentChordIndex = 0; // 現在のコード位置 (進行中)

// フレットのX座標の基準 (index.htmlのCSS/画像サイズに依存)
const fretLefts = [10, 55, 105, 153, 203, 235]; 
// 1弦から6弦のY座標の基準
const stringTops = [75, 92, 109, 126, 143, 158]; 


// UI要素の定義
const progressionSelect = document.getElementById('progressionSelect');
const nextChordButton = document.getElementById('nextChordButton');
const prevChordButton = document.getElementById('prevChordButton');
const randomProgressionButton = document.getElementById('randomProgressionButton');
const toggleAutoUpdateButton = document.getElementById('toggleAutoUpdate');
const autoUpdateTimeSelect = document.getElementById('autoUpdateTime');

const fretboardContainer = document.getElementById('fretboard-container');
const nextFretboardContainer = document.getElementById('next-fretboard-container');
const currentChordDisplayNameElement = document.getElementById('currentChordDisplayName');
const nextChordDisplayNameElement = document.getElementById('nextChordDisplayName');
const progressBar = document.getElementById('progressBar');


// =====================================================================
// ★★★ GAS連携と初期化ロジック ★★★
// =====================================================================

// GASからコードと進行の全データを取得する
async function loadChordDataFromGas() {
    try {
        const response = await fetch(GAS_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json(); 
        
        CHORD_DATA_MAP = data.chords; 
        CHORD_PROGRESSIONS_MAP = data.progressions; 
        
        console.log("スプレッドシートから全データをロードしました。");

        initializeApp();
        
    } catch (e) {
        console.error("GASからのデータロードに失敗しました。ローカルのフォールバックデータを使用します。", e);
        
        // ★★★ データロード失敗時の最低限のフォールバックデータ ★★★
        CHORD_DATA_MAP = {
            "C": { displayName: "C", lowFret: 0, fretPositions: [-1, 3, 2, 0, 1, 0] },
            "G": { displayName: "G", lowFret: 0, fretPositions: [3, 2, 0, 0, 0, 3] },
            "Am": { displayName: "Am", lowFret: 0, fretPositions: [-1, 0, 2, 2, 1, 0] },
            "Random": { displayName: "Random", lowFret: 0, fretPositions: [0, 0, 0, 0, 0, 0] }
        };
        CHORD_PROGRESSIONS_MAP = {
            "Random": ["C", "G", "Am", "F"], // Fはデータ不足だがランダム進行として定義
            "C_Only": ["C"]
        };
        // ----------------------------------------------------
        
        initializeApp(); 
    }
}

// アプリの初期化と一時選択進行のチェック
function initializeApp() {
    // 進行選択プルダウンを初期化（デフォルトのみ表示）
    initializeProgressionSelect();
    
    // ★★★ 進行一覧ページから一時選択された進行をチェックし、あればロードする ★★★
    const tempProgressionName = localStorage.getItem('tempProgressionSelection');
    if (tempProgressionName && CHORD_PROGRESSIONS_MAP[tempProgressionName]) {
        currentProgressionName = tempProgressionName;
        // プルダウンに一時進行のオプションを追加して選択
        addTemporaryProgressionOption(tempProgressionName); 
        console.log(`進行一覧から "${tempProgressionName}" をロードしました。`);
        
        // 使用後はlocalStorageから削除
        localStorage.removeItem('tempProgressionSelection');
    }
    
    // 初期進行で表示を始める 
    const targetProgression = CHORD_PROGRESSIONS_MAP[currentProgressionName] 
        ? currentProgressionName 
        : Object.keys(CHORD_PROGRESSIONS_MAP)[0]; // なければ最初の進行を使う

    if (targetProgression) {
        initializeProgression(targetProgression);
    } else {
        currentChordDisplayNameElement.textContent = "データなし";
        nextChordDisplayNameElement.textContent = "データなし";
    }
    
    // 各種イベントリスナーの設定
    setupEventListeners();
}

// プルダウンを初期化（デフォルト進行と一覧への導線のみ）
function initializeProgressionSelect() {
    const selectElement = document.getElementById('progressionSelect');
    selectElement.innerHTML = ''; 

    // 頻繁に使うデフォルトの進行リストを定義 (スプシに存在するものが優先される)
    const DEFAULT_PROGRESSION_NAMES = ['Random', 'Simple', 'Pachelbel']; 
    
    // 1. デフォルト進行のオプションを追加
    for (const name of DEFAULT_PROGRESSION_NAMES) {
        if (CHORD_PROGRESSIONS_MAP[name]) {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectElement.appendChild(option);
        }
    }
    
    // 2. 「進行一覧から追加」用の特別なオプションを追加
    const customOption = document.createElement('option');
    customOption.value = 'goToProgressionList';
    customOption.textContent = '--- 進行一覧から追加 ---';
    selectElement.appendChild(customOption);
    
    // ロードされた進行を選択状態にする
    selectElement.value = currentProgressionName;
}

// 進行一覧から戻ってきたときに一時的にオプションを追加する
function addTemporaryProgressionOption(progressionName) {
    const selectElement = document.getElementById('progressionSelect');
    
    // 新しいオプションを一番上に追加
    const option = document.createElement('option');
    option.value = progressionName;
    option.textContent = `▶️ ${progressionName} (一時)`;
    selectElement.insertBefore(option, selectElement.firstChild);
    selectElement.value = progressionName;
}

// イベントリスナー設定の関数 (initializeAppから呼ばれる)
function setupEventListeners() {
    const progressionForm = document.getElementById('progressionForm');
    
    // フォーム送信イベントの修正
    progressionForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const selectedValue = progressionSelect.value;
        
        if (selectedValue === 'goToProgressionList') {
            // 一覧へ移動
            window.location.href = 'progressions.html'; 
            return;
        }
        
        // 既存の処理（initリクエストの送信）
        sendAjaxRequest('init', selectedValue);
    });
    
    // 既存のボタンイベントリスナー
    prevChordButton.addEventListener('click', function() {
        sendAjaxRequest('prev'); 
    });

    nextChordButton.addEventListener('click', function() {
        sendAjaxRequest('next'); 
    });

    randomProgressionButton.addEventListener('click', function() {
        progressionSelect.value = 'Random'; 
        sendAjaxRequest('init', 'Random');
    });

    // 自動更新イベントリスナー設定
    toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);
    // プルダウン変更時、自動更新中なら停止後新しい間隔で再開
    autoUpdateTimeSelect.addEventListener('change', function() {
        if (autoUpdateIntervalId !== null) {
            stopAutoUpdate();
            startAutoUpdate(); 
        }
    });
}

// =====================================================================
// ★★★ アプリコアロジック ★★★
// =====================================================================

/**
 * コード情報を元にフレットボードにドットを描画する関数
 */
function drawFretboardDots(chordInfo, fretboardContainer) {
    // 既存のドットをクリア
    fretboardContainer.innerHTML = '';
    
    // 画像URLの修正 (.jpgを使用)
    const fretboardImageBase = 'fretboard';
    // lowFretは1フレット(0)から数えるため、6フレット以上(5を超える)ならfretboard2.jpg
    const imageSuffix = (chordInfo.lowFret > 5) ? '2' : ''; 
    fretboardContainer.style.backgroundImage = `url('${fretboardImageBase}${imageSuffix}.jpg')`; 

    // lowFretが1より大きい場合は、基準フレットを表示
    if (chordInfo.lowFret > 1) {
        const lowFretDisplay = document.createElement('div');
        lowFretDisplay.className = 'low-fret-display';
        lowFretDisplay.textContent = chordInfo.lowFret;
        lowFretDisplay.style.top = '10px';
        lowFretDisplay.style.left = '5px';
        fretboardContainer.appendChild(lowFretDisplay);
    }

    // 6弦から1弦までループ
    for (let i = 0; i < chordInfo.fretPositions.length; i++) {
        // i=0が6弦, i=5が1弦
        const stringFret = chordInfo.fretPositions[i];
        const stringIndex = 5 - i; // 0:6弦 -> 5:1弦 (stringTopsの配列と逆順)

        let element;
        let xPos;
        let yPos = stringTops[stringIndex]; // 弦のY位置

        if (stringFret === -1) {
            // ミュート (X)
            element = document.createElement('div');
            element.className = 'mute';
            element.textContent = 'X';
            xPos = fretLefts[0]; // 0フレット付近
        } else if (stringFret === 0) {
            // 開放弦 (〇)
            element = document.createElement('div');
            element.className = 'open';
            element.textContent = '〇';
            xPos = fretLefts[0];
        } else {
            // 押弦ドット
            element = document.createElement('div');
            element.className = 'dot';
            
            // 相対フレット位置の計算 (lowFretが0なら relativeFret = stringFret)
            const relativeFret = stringFret - chordInfo.lowFret;
            if (relativeFret >= 1 && relativeFret <= 5) {
                // 1フレットから5フレットの範囲
                xPos = fretLefts[relativeFret];
            } else {
                // 表示範囲外またはエラー
                continue; 
            }
        }

        element.style.left = `${xPos}px`;
        element.style.top = `${yPos}px`;
        fretboardContainer.appendChild(element);
    }
}


/**
 * コード進行を初期化し、最初のコードと次のコードを表示する
 */
function initializeProgression(progressionName) {
    const chords = CHORD_PROGRESSIONS_MAP[progressionName];
    if (!chords || chords.length === 0) return;
    
    currentProgressionName = progressionName;
    currentChordIndex = 0;
    
    // 最初のコードを表示
    const currentChordKey = chords[currentChordIndex];
    const nextChordKey = chords.length > 1 ? chords[currentChordIndex + 1] : chords[0]; 
    
    const currentChordInfo = CHORD_DATA_MAP[currentChordKey];
    const nextChordInfo = CHORD_DATA_MAP[nextChordKey];

    // 表示更新
    updateDisplay(currentChordInfo, nextChordInfo);
    updateProgressBar();
    
    // 自動更新がONならリセット
    if (autoUpdateIntervalId !== null) {
        stopAutoUpdate();
        startAutoUpdate();
    }
}


/**
 * 「次へ」「前へ」などの操作に応じたコードの切り替えと表示更新
 */
function sendAjaxRequest(action, newProgressionName = null) {
    stopAutoUpdate(); // 手動操作時は自動更新を一時停止

    // 進行切り替え (init)
    if (action === 'init' && newProgressionName) {
        initializeProgression(newProgressionName);
        return;
    }

    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) return;

    let nextIndex = currentChordIndex;

    // インデックスの計算
    if (action === 'next' || action === 'auto') {
        nextIndex = (currentChordIndex + 1) % chords.length;
    } else if (action === 'prev') {
        nextIndex = (currentChordIndex - 1 + chords.length) % chords.length;
    } else {
        return; 
    }
    
    currentChordIndex = nextIndex;

    // コード情報取得
    const currentChordKey = chords[currentChordIndex];
    const nextChordKey = chords[(currentChordIndex + 1) % chords.length];
    
    const currentChordInfo = CHORD_DATA_MAP[currentChordKey];
    const nextChordInfo = CHORD_DATA_MAP[nextChordKey];

    // 表示更新
    updateDisplay(currentChordInfo, nextChordInfo);
    updateProgressBar();
}

// 表示内容をまとめて更新
function updateDisplay(currentChordInfo, nextChordInfo) {
    if (currentChordInfo) {
        currentChordDisplayNameElement.textContent = currentChordInfo.displayName;
        drawFretboardDots(currentChordInfo, fretboardContainer);
    } else {
        currentChordDisplayNameElement.textContent = "コードデータなし";
        fretboardContainer.innerHTML = '';
        fretboardContainer.style.backgroundImage = "none";
    }

    if (nextChordInfo) {
        nextChordDisplayNameElement.textContent = nextChordInfo.displayName;
        drawFretboardDots(nextChordInfo, nextFretboardContainer);
    } else {
        nextChordDisplayNameElement.textContent = "次のコードなし";
        nextFretboardContainer.innerHTML = '';
        nextFretboardContainer.style.backgroundImage = "none";
    }
}


// 自動更新の開始/停止ロジック
function startAutoUpdate() {
    stopAutoUpdate(); 
    const intervalTime = parseInt(autoUpdateTimeSelect.value);
    autoUpdateIntervalId = setInterval(function() {
        sendAjaxRequest('auto');
    }, intervalTime);
    toggleAutoUpdateButton.textContent = '一時停止';
}

function stopAutoUpdate() {
    if (autoUpdateIntervalId !== null) {
        clearInterval(autoUpdateIntervalId);
        autoUpdateIntervalId = null;
        toggleAutoUpdateButton.textContent = '再生';
    }
}

function toggleAutoUpdate() {
    if (autoUpdateIntervalId === null) {
        startAutoUpdate();
    } else {
        stopAutoUpdate();
    }
}

// プログレスバーの更新
function updateProgressBar() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) {
        progressBar.style.width = '0%';
        progressBar.textContent = '';
        return;
    }

    const progressPercent = ((currentChordIndex + 1) / chords.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    progressBar.textContent = `${currentChordIndex + 1} / ${chords.length}`;
}


// =====================================================================
// ★★★ アプリ起動時にデータロードを開始 ★★★
// =====================================================================
document.addEventListener('DOMContentLoaded', loadChordDataFromGas);