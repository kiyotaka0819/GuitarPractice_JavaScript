// ★★★ 必須: ここにGASのデプロイURLを貼り付ける！ ★★★
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbylBTT1V-B7Dgpw_ZgF7PJ4C0myzlM-ovo9mqTfnpEJ7EGnRQpcwo2-D1E4lLzGGsDn/exec';

// コード情報と進行情報（サーバーから取得後に更新される）
let CHORD_DATA_MAP = {};
let CHORD_PROGRESSIONS_MAP = {};

// 現在の練習状態
let currentProgressionName = 'C-G-Am-F'; // デフォルト値を設定
let currentChordIndex = 0;
let autoUpdateIntervalId = null; // 自動更新のインターバルID

// DOM要素
const fretboardContainer = document.getElementById('fretboard-container');
const nextFretboardContainer = document.getElementById('next-fretboard-container');
const currentChordDisplayNameElement = document.getElementById('current-chord-displayname');
const nextChordDisplayNameElement = document.getElementById('next-chord-displayname');
const progressionSelect = document.getElementById('progression-select');
const currentProgressionNameElement = document.getElementById('current-progression-name');
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
            // GAS側でエラーが検出された場合 (例: シートがない)
            throw new Error(`GASエラー: ${data.message || data.error}`);
        }

        CHORD_DATA_MAP = data.chords;
        CHORD_PROGRESSIONS_MAP = data.progressions;

        // エラーを非表示
        errorContainer.style.display = 'none';
        
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
        errorContainer.innerText = 'データの読み込みに失敗しました。GASのURLとデプロイ設定を確認してください。';
        errorContainer.style.display = 'block';
        throw error; // 呼び出し元にエラーを伝える
    }
}

/**
 * ページロード時の初期化
 */
async function initializeApp() {
    try {
        await fetchChordData();
        
        // データが存在しない場合はエラーを表示して終了
        const chordCount = Object.keys(CHORD_DATA_MAP).length;
        if (chordCount === 0) {
            errorContainer.innerText = 'GASからコードデータが取得できませんでした。スプレッドシートを確認してください。';
            errorContainer.style.display = 'block';
            return; // 処理を中断
        }

        // データが正常なら初期化を続行
        populateProgressionSelect();
        
        // ★★★ 修正箇所: 強制的にデフォルトの進行を設定するロジック ★★★
        const defaultProgressionName = 'C-G-Am-F';
        let initialProgression = defaultProgressionName;
        
        // C-G-Am-F が存在しない場合は、代わりに進行リストの最初のものを選択
        if (!CHORD_PROGRESSIONS_MAP[defaultProgressionName]) {
            const firstProgression = Object.keys(CHORD_PROGRESSIONS_MAP)[0];
            initialProgression = firstProgression || 'Random'; // 進行が一つもなければ'Random'
        }
        
        // プルダウンと内部状態を強制的に設定
        progressionSelect.value = initialProgression;
        currentProgressionName = initialProgression; 
        
        initializeProgression(currentProgressionName);

    } catch (error) {
        // fetchChordDataでエラーが出た場合は、既にエラーメッセージが表示されているはず
        console.warn('初期化中にエラー:', error);
    }
}

/**
 * プルダウンメニューにコード進行を追加
 */
function populateProgressionSelect() {
    progressionSelect.innerHTML = ''; // 一旦クリア
    for (const name in CHORD_PROGRESSIONS_MAP) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        progressionSelect.appendChild(option);
    }
    // 初期値を設定
    progressionSelect.value = currentProgressionName;
}


// ==============================================================================
// 2. ランダム進行生成ロジック
// ==============================================================================

/**
 * CHORD_DATA_MAPからランダムに16個のコードを選んで進行を生成する
 */
function generateRandomProgression() {
    const allChords = Object.keys(CHORD_DATA_MAP);
    if (allChords.length === 0) return ['C']; // フォールバック
    
    const randomProgression = [];
    const progressionLength = 16; // ランダムは16コードとする

    for (let i = 0; i < progressionLength; i++) {
        const randomIndex = Math.floor(Math.random() * allChords.length);
        randomProgression.push(allChords[randomIndex]);
    }
    
    // 生成した進行を一時的にCHORD_PROGRESSIONS_MAPに保存
    CHORD_PROGRESSIONS_MAP['Random'] = randomProgression;
    return randomProgression;
}

/**
 * 選択された進行を初期化する
 */
function initializeProgression(progressionName) {
    
    if (progressionName === 'Random') {
        // Randomが選択されたらランダム進行を生成
        generateRandomProgression();
        // generateRandomProgressionがCHORD_PROGRESSIONS_MAP['Random']を更新するので、
        // そのまま下の処理に進める
    }
    
    const chords = CHORD_PROGRESSIONS_MAP[progressionName];
    if (!chords || chords.length === 0) {
        console.error(`進行名 ${progressionName} のデータが見つかりません。`);
        // データがない場合は強制的にRandomを生成して初期化を試みる
        if (progressionName !== 'Random') {
            initializeProgression('Random');
        }
        return;
    }
    
    currentProgressionName = progressionName;
    currentChordIndex = 0;
    
    // 表示を更新
    currentProgressionNameElement.innerText = progressionName;
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

    // 次のコード情報 (進行の最後までいったら null)
    const nextChordName = chords[currentChordIndex + 1];
    const nextChordInfo = nextChordName ? CHORD_DATA_MAP[nextChordName] : null;

    // 現在のコードの更新
    if (currentChordInfo) {
        currentChordDisplayNameElement.innerText = currentChordInfo.displayName;
        drawFretboardDots(currentChordInfo, fretboardContainer);
    } else {
        currentChordDisplayNameElement.innerText = currentChordName + " (データなし)";
        drawEmptyFretboard(fretboardContainer);
    }

    // 次のコードの更新
    if (nextChordInfo) {
        nextChordDisplayNameElement.innerText = nextChordInfo.displayName;
        drawFretboardDots(nextChordInfo, nextFretboardContainer);
    } else {
        nextChordDisplayNameElement.innerText = "コードなし";
        drawEmptyFretboard(nextFretboardContainer);
    }

    updateProgressBar();
    updateButtonStates();
}

/**
 * 押弦情報を元にフレットボードを描画
 */
function drawFretboardDots(chordInfo, container) {
    container.innerHTML = '';
    container.className = 'fretboard'; // クラスをリセット
    container.style.backgroundImage = 'url("fretboard.png")'; // 背景画像を設定
    
    const fretPositions = chordInfo.fretPositions;
    const lowFret = chordInfo.lowFret;
    const isBarChord = lowFret > 0;
    
    // フレット番号の表示
    if (isBarChord) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.innerText = lowFret;
        container.appendChild(fretLabel);
    }
    
    // 6弦から1弦までループ
    for (let i = 0; i < 6; i++) {
        const stringPos = fretPositions[i]; // 6弦がi=0, 1弦がi=5
        const stringElement = document.createElement('div');
        stringElement.className = `string string-${i}`;
        
        if (stringPos === -1) {
            // ミュート(×)
            const mute = document.createElement('div');
            mute.className = 'mute-mark';
            mute.innerText = '×';
            stringElement.appendChild(mute);
        } else if (stringPos === 0) {
            // 開放弦(○)
            const open = document.createElement('div');
            open.className = 'open-mark';
            stringElement.appendChild(open);
        } else {
            // 押弦ドット
            const dot = document.createElement('div');
            dot.className = 'dot';
            
            // ドットの位置を計算 (CSSで定義されたフレット幅に基づいて調整)
            let fretNumber = stringPos;
            if (isBarChord) {
                fretNumber = stringPos - lowFret + 1; // バンドフレットからの相対位置
            }
            
            // Fret 1 (fretNumber=1) は 1フレット目の中央に配置
            // スタイルはfretboard.cssに依存するため、ここではCSSクラスとデータ属性のみ設定
            dot.setAttribute('data-fret', fretNumber);
            
            stringElement.appendChild(dot);
        }
        container.appendChild(stringElement);
    }
}

/**
 * 空のフレットボードを描画
 */
function drawEmptyFretboard(container) {
    container.innerHTML = '';
    container.className = 'fretboard empty';
    container.style.backgroundImage = 'url("fretboard.png")'; 
}


/**
 * プログレスバーの更新
 */
function updateProgressBar() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords || chords.length === 0) return;
    
    const percentage = ((currentChordIndex + 1) / chords.length) * 100;
    progressBar.style.width = percentage + '%';
    progressBar.innerText = `${currentChordIndex + 1} / ${chords.length}`;
}

/**
 * ボタンの有効/無効状態を更新
 */
function updateButtonStates() {
    const chords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
    if (!chords) return;
    
    prevChordButton.disabled = currentChordIndex === 0;
    // 進行の最後で「次へ」を押したら最初に戻る仕様なので、nextChordButtonは常に有効
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

/**
 * 自動更新を開始する
 */
function startAutoUpdate() {
    const intervalTime = parseInt(autoUpdateTimeSelect.value); // ms
    if (isNaN(intervalTime) || intervalTime <= 0) return;

    // 既に動いている場合は何もしない
    if (autoUpdateIntervalId !== null) return; 

    // 1. ボタンを停止モードに
    toggleAutoUpdateButton.innerText = '自動更新停止';
    toggleAutoUpdateButton.classList.add('active');

    // 2. インターバルを開始
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

/**
 * 自動更新を停止する
 */
function stopAutoUpdate() {
    if (autoUpdateIntervalId !== null) {
        clearInterval(autoUpdateIntervalId);
        autoUpdateIntervalId = null;
    }
    // ボタンを再生モードに
    toggleAutoUpdateButton.innerText = '自動更新開始';
    toggleAutoUpdateButton.classList.remove('active');
}

/**
 * 自動更新のトグル
 */
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

// 「前のコード」ボタン
prevChordButton.addEventListener('click', function() {
    stopAutoUpdate();
    navigateProgression('prev');
});

// 「次のコード」ボタン
nextChordButton.addEventListener('click', function() {
    stopAutoUpdate();
    navigateProgression('next');
});

// ランダム進行生成/初期化
randomProgressionButton.addEventListener('click', function() {
    // 既存の自動更新を停止
    stopAutoUpdate();
    
    progressionSelect.value = 'Random'; 
    initializeProgression('Random');
});

// プルダウン変更時の処理
progressionSelect.addEventListener('change', function() {
    const selectedProgression = this.value;
    
    // 既存の自動更新を停止
    stopAutoUpdate();
    
    // 新しい進行で初期化
    initializeProgression(selectedProgression);
});


// 自動更新イベントリスナー
toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);

// プルダウン変更時、自動更新中なら停止後新しい間隔で再開
autoUpdateTimeSelect.addEventListener('change', function() {
    if (autoUpdateIntervalId !== null) {
        stopAutoUpdate();
        startAutoUpdate(); 
    }
});