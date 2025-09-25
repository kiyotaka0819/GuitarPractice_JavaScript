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
const currentChordDisplayNameElement = document.getElementById('current-chord-displayname');
const nextChordDisplayNameElement = document.getElementById('next-chord-displayname');
const progressionSelect = document.getElementById('progression-select');
const currentProgressionNameElement = document.getElementById('current-progression-name'); // ★★★ 修正：クラッシュの原因はこれの欠落 ★★★
const progressBar = document.getElementById('progress-bar');
const prevChordButton = document.getElementById('prev-chord-button');
const nextChordButton = document.getElementById('next-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const autoUpdateTimeSelect = document.getElementById('auto-update-time');
const errorContainer = document.getElementById('error-container');

// ==============================================================================
// 1. データ取得と初期化
// ==============================================================================

/**
 * GASからコードと進行データを取得する
 */
async function fetchChordData() {
    try {
        const response = await fetch(GAS_API_URL);
        if (!response.ok) {
            throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`GASエラー: ${data.message || data.error}`);
        }

        CHORD_DATA_MAP = data.chords;
        CHORD_PROGRESSIONS_MAP = data.progressions;

        errorContainer.style.display = 'none';
        
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        // エラーコンテナの存在チェックは不要だが、コードの堅牢性のため
        if (errorContainer) {
            errorContainer.innerText = 'データの読み込みに失敗しました。GASのURLとデプロイ設定を確認してください。';
            errorContainer.style.display = 'block';
        }
        throw error;
    }
}

/**
 * ページロード時の初期化
 */
async function initializeApp() {
    try {
        await fetchChordData();
        
        const chordCount = Object.keys(CHORD_DATA_MAP).length;
        if (chordCount === 0) {
            if (errorContainer) {
                errorContainer.innerText = 'GASからコードデータが取得できませんでした。スプレッドシートを確認してください。';
                errorContainer.style.display = 'block';
            }
            return;
        }

        populateProgressionSelect();
        
        const defaultProgressionName = 'C-G-Am-F';
        let initialProgression = defaultProgressionName;
        
        if (!CHORD_PROGRESSIONS_MAP[defaultProgressionName]) {
            const firstProgression = Object.keys(CHORD_PROGRESSIONS_MAP)[0];
            initialProgression = firstProgression || 'Random';
        }
        
        if (progressionSelect) {
            progressionSelect.value = initialProgression;
        }
        currentProgressionName = initialProgression; 
        
        initializeProgression(currentProgressionName);

    } catch (error) {
        console.warn('初期化中にエラー:', error);
        // initializeProgressionでクラッシュした場合は、データは読み込まれているがDOMがない可能性がある
    }
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
        option.textContent = name;
        progressionSelect.appendChild(option);
    }
    progressionSelect.value = currentProgressionName;
}


// ==============================================================================
// 2. ランダム進行生成ロジックと進行初期化
// ==============================================================================

/**
 * CHORD_DATA_MAPからランダムに16個のコードを選んで進行を生成する
 */
function generateRandomProgression() {
    const allChords = Object.keys(CHORD_DATA_MAP);
    if (allChords.length === 0) return ['C'];
    
    const randomProgression = [];
    const progressionLength = 16; 

    for (let i = 0; i < progressionLength; i++) {
        const randomIndex = Math.floor(Math.random() * allChords.length);
        randomProgression.push(allChords[randomIndex]);
    }
    
    CHORD_PROGRESSIONS_MAP['Random'] = randomProgression;
    return randomProgression;
}

/**
 * 選択された進行を初期化する
 */
function initializeProgression(progressionName) {
    
    if (progressionName === 'Random') {
        generateRandomProgression();
    }
    
    const chords = CHORD_PROGRESSIONS_MAP[progressionName];
    if (!chords || chords.length === 0) {
        console.error(`進行名 ${progressionName} のデータが見つかりません。`);
        if (progressionName !== 'Random') {
            initializeProgression('Random');
        }
        return;
    }
    
    currentProgressionName = progressionName;
    currentChordIndex = 0;
    
    // 表示を更新
    if (currentProgressionNameElement) { // ★★★ 修正：DOMが存在するかチェック ★★★
        currentProgressionNameElement.innerText = progressionName; // L168のエラー箇所
    }
    updateDisplay();
}

// ==============================================================================
// 3. 表示更新とイベントハンドラ
// ==============================================================================

/**
 * フレットボードの表示を更新
 */
function updateDisplay() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) return;

    // 現在のコード情報
    const currentChordName = chords[currentChordIndex];
    const currentChordInfo = CHORD_DATA_MAP[currentChordName];

    // ★★★ 修正箇所: 次のコード情報 (循環ロジックをここで適用) ★★★
    const nextChordIndex = (currentChordIndex + 1) % chords.length; // 進行の最後で0に戻る
    const nextChordName = chords[nextChordIndex];
    const nextChordInfo = CHORD_DATA_MAP[nextChordName];
    // ★★★ 修正ここまで ★★★

    // 現在のコードの更新
    if (currentChordInfo && currentChordDisplayNameElement) {
        currentChordDisplayNameElement.innerText = currentChordInfo.displayName;
        drawFretboardDots(currentChordInfo, fretboardContainer);
    } else if (currentChordDisplayNameElement) {
        currentChordDisplayNameElement.innerText = currentChordName + " (データなし)";
        drawEmptyFretboard(fretboardContainer);
    }

    // 次のコードの更新
    if (nextChordInfo && nextChordDisplayNameElement) {
        nextChordDisplayNameElement.innerText = nextChordInfo.displayName;
        drawFretboardDots(nextChordInfo, nextFretboardContainer);
    } else if (nextChordDisplayNameElement) {
        nextChordDisplayNameElement.innerText = nextChordName + " (データなし)"; // nextChordNameは必ずある
        drawEmptyFretboard(nextFretboardContainer);
    }

    updateProgressBar();
    updateButtonStates();
}

/**
 * 押弦情報を元にフレットボードを描画
 */
function drawFretboardDots(chordInfo, container) {
    if (!container) return;
    
    container.innerHTML = '';
    container.className = 'fretboard';
    // CSSで背景画像を設定しているため、JSでは一旦コメントアウト
    // container.style.backgroundImage = 'url("fretboard.png")'; 
    
    const fretPositions = chordInfo.fretPositions;
    const lowFret = chordInfo.lowFret;
    const isBarChord = lowFret > 0;
    
    // フレット番号の表示 (ハイフレット時)
    if (isBarChord) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.innerText = lowFret;
        // 左側の縦方向の中央に配置
        fretLabel.style.position = 'absolute';
        fretLabel.style.left = '5px';
        fretLabel.style.top = '50%';
        fretLabel.style.transform = 'translateY(-50%)';
        container.appendChild(fretLabel);
    }
    
    // 6弦から1弦までループ
    for (let i = 0; i < 6; i++) {
        const stringPos = fretPositions[i]; // 6弦がi=0, 1弦がi=5
        const stringElement = document.createElement('div');
        stringElement.className = `string string-${i}`;
        
        // ★★★ 修正箇所: 弦の横位置をJSで直接計算し、ドットを配置する ★★★
        // 0 (6弦) -> 12%, 1 (5弦) -> 28%, 2 (4弦) -> 44%, 3 (3弦) -> 60%, 4 (2弦) -> 76%, 5 (1弦) -> 92%
        stringElement.style.position = 'absolute';
        stringElement.style.left = `${12 + i * 16}%`; // 弦の横位置
        stringElement.style.width = '1px'; // 弦の幅はほぼゼロ
        stringElement.style.height = '100%';
        stringElement.style.top = '0';
        // ★★★ 修正ここまで ★★★
        
        if (stringPos === -1) {
            // ミュート(×)
            const mute = document.createElement('div');
            mute.className = 'mute-mark';
            mute.innerText = '×';
            mute.style.top = '-10px'; // ナットより上に配置
            stringElement.appendChild(mute);
        } else if (stringPos === 0) {
            // 開放弦(○)
            const open = document.createElement('div');
            open.className = 'open-mark';
            open.innerText = '〇';
            open.style.top = '-10px'; // ナットより上に配置
            stringElement.appendChild(open);
        } else {
            // 押弦ドット
            const dot = document.createElement('div');
            dot.className = 'dot';
            
            let fretNumber = stringPos;
            if (isBarChord) {
                fretNumber = stringPos - lowFret + 1; // バンドフレットからの相対位置 (1～5を想定)
            }
            
            // ★★★ 修正箇所: ドットの縦位置を直接設定してバグを防ぐ ★★★
            // 縦方向の位置の調整 (1フレット目の中央: 10%, 2フレット目の中央: 30%, ...)
            if (fretNumber >= 1 && fretNumber <= 5) { // 5フレット表示を想定
                // 1フレット目の中央にドットを配置 (20%間隔で)
                dot.style.top = `${fretNumber * 20 - 10}%`; 
            } else {
                // 5フレットを超える押弦は、フレットボード外に描画されないようにする
                dot.style.display = 'none'; 
            }
            // ★★★ 修正ここまで ★★★
            
            stringElement.appendChild(dot);
        }
        container.appendChild(stringElement);
    }
}

/**
 * 空のフレットボードを描画
 */
function drawEmptyFretboard(container) {
    if (!container) return;
    container.innerHTML = '';
    container.className = 'fretboard empty';
    // container.style.backgroundImage = 'url("fretboard.png")'; // CSSで設定済み 
}


/**
 * プログレスバーの更新
 */
function updateProgressBar() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0 || !progressBar) return;
    
    const percentage = ((currentChordIndex + 1) / chords.length) * 100;
    progressBar.style.width = percentage + '%';
    progressBar.innerText = `${currentChordIndex + 1} / ${chords.length}`;
}

/**
 * ボタンの有効/無効状態を更新
 */
function updateButtonStates() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || !prevChordButton || !nextChordButton) return;
    
    // 「次へ」は常に有効（循環するため）
    prevChordButton.disabled = currentChordIndex === 0;
    nextChordButton.disabled = false;
}

/**
 * 進行のインデックスを操作
 */
function navigateProgression(direction) {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords) return;
    
    if (direction === 'next') {
        // 進行の最後までいったら、最初に戻ってループ
        if (currentChordIndex === chords.length - 1) {
            currentChordIndex = 0;
        } else {
            currentChordIndex++;
        }
    } else if (direction === 'prev' && currentChordIndex > 0) {
        currentChordIndex--;
    }
    
    updateDisplay();
}

// ==============================================================================
// 4. 自動更新
// ==============================================================================

function startAutoUpdate() {
    // ... (関数の中身は変更なし)
    const intervalTime = parseInt(autoUpdateTimeSelect.value); // ms
    if (isNaN(intervalTime) || intervalTime <= 0) return;

    if (autoUpdateIntervalId !== null) return; 

    if (toggleAutoUpdateButton) {
        toggleAutoUpdateButton.innerText = '自動更新停止';
        toggleAutoUpdateButton.classList.add('active');
    }

    autoUpdateIntervalId = setInterval(() => {
        const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
        if (!chords) return stopAutoUpdate(); 

        // 進行の最後までいったら、最初に戻ってループ
        if (currentChordIndex === chords.length - 1) {
            currentChordIndex = 0;
        } else {
            currentChordIndex++;
        }
        updateDisplay();
    }, intervalTime);
}

function stopAutoUpdate() {
    // ... (関数の中身は変更なし)
    if (autoUpdateIntervalId !== null) {
        clearInterval(autoUpdateIntervalId);
        autoUpdateIntervalId = null;
    }
    if (toggleAutoUpdateButton) {
        toggleAutoUpdateButton.innerText = '自動更新開始';
        toggleAutoUpdateButton.classList.remove('active');
    }
}

function toggleAutoUpdate() {
    if (autoUpdateIntervalId !== null) {
        stopAutoUpdate();
    } else {
        startAutoUpdate();
    }
}


// ==============================================================================
// 5. イベントリスナーの設定
// ==============================================================================

document.addEventListener('DOMContentLoaded', initializeApp);

// イベントリスナーの存在チェック
if (prevChordButton) {
    prevChordButton.addEventListener('click', function() {
        stopAutoUpdate();
        navigateProgression('prev');
    });
}

if (nextChordButton) {
    nextChordButton.addEventListener('click', function() {
        stopAutoUpdate();
        navigateProgression('next');
    });
}

if (randomProgressionButton) {
    randomProgressionButton.addEventListener('click', function() {
        stopAutoUpdate();
        if (progressionSelect) progressionSelect.value = 'Random'; 
        initializeProgression('Random');
    });
}

if (progressionSelect) {
    progressionSelect.addEventListener('change', function() {
        const selectedProgression = this.value;
        stopAutoUpdate();
        initializeProgression(selectedProgression);
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