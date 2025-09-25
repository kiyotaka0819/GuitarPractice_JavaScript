// script.js

// =======================================================================
// 1. コードデータ定義 (ChordChange.java の static ブロックを再現)
// =======================================================================

// ChordInfo.java の構造: displayName, lowFret, fretPositions
const CHORD_DATA_MAP = {
    // Major Chords
    "C": { displayName: "C", lowFret: 0, fretPositions: [-1, 3, 2, 0, 1, 0] },
    "C#": { displayName: "C#", lowFret: 4, fretPositions: [-1, 4, 6, 6, 6, 4] },
    "D": { displayName: "D", lowFret: 0, fretPositions: [-1, -1, 0, 2, 3, 2] },
    "D#": { displayName: "D#", lowFret: 6, fretPositions: [-1, 6, 8, 8, 8, 6] },
    "E": { displayName: "E", lowFret: 0, fretPositions: [0, 2, 2, 1, 0, 0] },
    "F": { displayName: "F", lowFret: 1, fretPositions: [1, 3, 3, 2, 1, 1] },
    "F#": { displayName: "F#", lowFret: 2, fretPositions: [2, 4, 4, 3, 2, 2] },
    "G": { displayName: "G", lowFret: 0, fretPositions: [3, 2, 0, 0, 0, 3] },
    "G#": { displayName: "G#", lowFret: 4, fretPositions: [4, 6, 6, 5, 4, 4] },
    "A": { displayName: "A", lowFret: 0, fretPositions: [-1, 0, 2, 2, 2, 0] },
    "A#": { displayName: "A#", lowFret: 6, fretPositions: [6, 8, 8, 7, 6, 6] },
    "B": { displayName: "B", lowFret: 2, fretPositions: [-1, 2, 4, 4, 4, 2] },

    // Minor Chords
    "Cm": { displayName: "Cm", lowFret: 3, fretPositions: [-1, 3, 5, 5, 4, 3] },
    "C#m": { displayName: "C#m", lowFret: 4, fretPositions: [-1, 4, 6, 6, 5, 4] },
    "Dm": { displayName: "Dm", lowFret: 0, fretPositions: [-1, -1, 0, 2, 3, 1] },
    "D#m": { displayName: "D#m", lowFret: 6, fretPositions: [-1, 6, 8, 8, 7, 6] },
    "Em": { displayName: "Em", lowFret: 0, fretPositions: [0, 2, 2, 0, 0, 0] },
    "Fm": { displayName: "Fm", lowFret: 1, fretPositions: [1, 3, 3, 1, 1, 1] },
    "F#m": { displayName: "F#m", lowFret: 2, fretPositions: [2, 4, 4, 2, 2, 2] },
    "Gm": { displayName: "Gm", lowFret: 3, fretPositions: [3, 5, 5, 3, 3, 3] },
    "G#m": { displayName: "G#m", lowFret: 4, fretPositions: [4, 6, 6, 4, 4, 4] },
    "Am": { displayName: "Am", lowFret: 0, fretPositions: [-1, 0, 2, 2, 1, 0] },
    "A#m": { displayName: "A#m", lowFret: 6, fretPositions: [6, 8, 8, 6, 6, 6] },
    "Bm": { displayName: "Bm", lowFret: 2, fretPositions: [-1, 2, 4, 4, 3, 2] },

    // Seventh Chords
    "C7": { displayName: "C7", lowFret: 0, fretPositions: [-1, 3, 2, 3, 1, 0] },
    "C#7": { displayName: "C#7", lowFret: 4, fretPositions: [-1, 4, 6, 4, 6, 4] },
    "D7": { displayName: "D7", lowFret: 0, fretPositions: [-1, -1, 0, 2, 1, 2] },
    "D#7": { displayName: "D#7", lowFret: 6, fretPositions: [-1, 6, 8, 6, 8, 6] },
    "E7": { displayName: "E7", lowFret: 0, fretPositions: [0, 2, 0, 1, 0, 0] },
    "F7": { displayName: "F7", lowFret: 1, fretPositions: [1, 3, 1, 2, 1, 1] },
    "F#7": { displayName: "F#7", lowFret: 2, fretPositions: [-1, 2, 4, 2, 4, 2] },
    "G7": { displayName: "G7", lowFret: 0, fretPositions: [3, 2, 0, 0, 0, 1] },
    "G#7": { displayName: "G#7", lowFret: 4, fretPositions: [-1, 4, 6, 4, 6, 4] },
    "A7": { displayName: "A7", lowFret: 0, fretPositions: [-1, 0, 2, 0, 2, 0] },
    "A#7": { displayName: "A#7", lowFret: 6, fretPositions: [-1, 6, 8, 6, 8, 6] },
    "B7": { displayName: "B7", lowFret: 2, fretPositions: [-1, 2, 1, 2, 0, 2] },

    // Other Chords
    "Am7": { displayName: "Am7", lowFret: 0, fretPositions: [-1, 0, 2, 0, 1, 0] },
    "Dm7": { displayName: "Dm7", lowFret: 0, fretPositions: [-1, -1, 0, 2, 1, 1] },
    "Em7": { displayName: "Em7", lowFret: 0, fretPositions: [0, 2, 0, 0, 0, 0] },
    "Cdim": { displayName: "Cdim", lowFret: 0, fretPositions: [-1, 3, 4, 2, 4, -1] },
    "Caug": { displayName: "Caug", lowFret: 0, fretPositions: [-1, 3, 2, 1, 1, 0] },
    "Bm7(b5)": { displayName: "Bm7(b5)", lowFret: 2, fretPositions: [-1, 2, 3, 2, 3, -1] },
    "Gmaj7": { displayName: "Gmaj7", lowFret: 0, fretPositions: [3, 2, 0, 0, 0, 2] },
    "Cmaj7": { displayName: "Cmaj7", lowFret: 0, fretPositions: [-1, 3, 2, 0, 0, 0] },
    "Fmaj7": { displayName: "Fmaj7", lowFret: 0, fretPositions: [1, 3, 2, 2, 1, 0] }
};

// コード進行データ
const CHORD_PROGRESSIONS_MAP = {
    "C-G-Am-F": ["C", "G", "Am", "F"],
    "G-C-D-G": ["G", "C", "D", "G"],
    "Am-G-C-F": ["Am", "G", "C", "F"],
    "Em-C-G-D": ["Em", "C", "G", "D"],
    "ブルースコード進行": ["E7", "A7", "E7", "E7", "A7", "A7", "E7", "E7", "B7", "A7", "E7", "B7"],
    "ジャズマイナー進行": ["Dm7", "G7", "C", "F"],
    "カノン進行": ["C", "G", "Am", "Em", "F", "C", "Dm", "G"],
    "小室進行": ["Am", "G", "C", "F"],
    "丸サ進行": ["Am7", "D7", "Gmaj7", "Cmaj7", "Fmaj7", "Bm7(b5)", "E7", "Am7"],
    "王道進行": ["C", "G", "Am", "Em"],
    "裏循環": ["C", "C7", "F", "Fm"],
    "ツーファイブワン": ["Dm7", "G7", "Cmaj7"],
    "Random": ["Random"] // 特別なキー
};

const CHORD_NAMES_LIST = Object.keys(CHORD_DATA_MAP);
const PROGRESSION_NAMES_LIST = Object.keys(CHORD_PROGRESSIONS_MAP);

// =======================================================================
// 2. 状態管理 (Java Servletの Session / doGet ロジックを再現)
// =======================================================================

// セッション変数の代わりとなるグローバル変数
let currentProgressionName = PROGRESSION_NAMES_LIST[0]; // デフォルトは最初の進行
let currentIndex = 0;
let currentProgressionChords = CHORD_PROGRESSIONS_MAP[currentProgressionName];
let autoUpdateIntervalId = null;

// 定数 (JSPのJSブロックから取得)
// 弦ごとのY座標 (1弦から6弦)
const stringTops = [75, 92, 109, 126, 143, 158];
// フレットごとのX座標 (0フレットから4フレット)
const fretLefts = [10, 55, 105, 153, 203, 235];
const fretboardImageBase = 'fretboard'; // ギターフレットボード画像ファイル名（別途用意が必要）

// =======================================================================
// 3. ユーティリティ関数
// =======================================================================

/**
 * ランダムなコード進行を生成する (ChordChange.javaのRandom処理を再現)
 * @returns {Array<string>} コード名の配列
 */
function generateRandomProgression() {
    const min = 6;
    const max = 9;
    const numberOfChords = Math.floor(Math.random() * (max - min + 1)) + min;
    const progression = [];
    for (let i = 0; i < numberOfChords; i++) {
        const randomIndex = Math.floor(Math.random() * CHORD_NAMES_LIST.length);
        progression.push(CHORD_NAMES_LIST[randomIndex]);
    }
    return progression;
}

/**
 * フレットボードにドット、ミュート、開放弦インジケーター描画 (JSPの drawFretboardDots を移植)
 * @param {Object} chordInfo - コード情報
 * @param {HTMLElement} containerElement - 描画対象コンテナ
 * @param {string} containerId - コンテナID ('current' or 'next')
 */
function drawFretboardDots(chordInfo, containerElement, containerId) {
    // [cite: 353] 無効なコード情報の場合、クリア
    if (!chordInfo || !chordInfo.fretPositions || chordInfo.fretPositions.length !== 6) {
        containerElement.innerHTML = '';
        containerElement.style.backgroundImage = "none";
        return;
    }
    containerElement.innerHTML = '';

    const lowFretValue = chordInfo.lowFret;
    // ローフレット値で背景画像切り替え
    // GitHub Pagesなので、画像パスはルートからの相対パスで仮定
    const imageSuffix = lowFretValue > 2 ? '2' : ''; // 
    containerElement.style.backgroundImage = `url('${fretboardImageBase}${imageSuffix}.jpg')`; 

    // ローフレット値が2より大きい場合、フレット番号表示 [cite: 355]
    if (lowFretValue > 2) {
        const lowFretDiv = document.createElement('div');
        lowFretDiv.className = 'low-fret-display';
        lowFretDiv.textContent = lowFretValue;
        lowFretDiv.style.top = '70px'; // 適切な位置に調整
        lowFretDiv.style.left = '10px';
        containerElement.appendChild(lowFretDiv);
    }

    // 6弦から1弦までループ
    // JavaのfretPositionsは6弦から1弦の順 [cite: 388]
    // stringTopsは1弦から6弦の順 [cite: 350]
    for (let i = 0; i < 6; i++) {
        // Javaコードのインデックス i は6弦(0)から1弦(5)
        const stringIndex = 5 - i; // 1弦(0)から6弦(5)への変換
        const fret = chordInfo.fretPositions[i];
        const yPos = stringTops[stringIndex]; // 弦のY座標

        if (fret === -1) {
            // ミュート (X) [cite: 489]
            const muteDiv = document.createElement('div');
            muteDiv.className = 'mute';
            muteDiv.textContent = 'X';
            muteDiv.style.top = `${yPos}px`;
            muteDiv.style.left = `${fretLefts[0]}px`; // 0フレット(ヘッド側)の位置
            containerElement.appendChild(muteDiv);
        } else if (fret === 0) {
            // 開放弦 (〇) [cite: 493]
            const openDiv = document.createElement('div');
            openDiv.className = 'open';
            openDiv.textContent = '●';
            openDiv.style.top = `${yPos}px`;
            openDiv.style.left = `${fretLefts[0]}px`; // 0フレット(ヘッド側)の位置
            containerElement.appendChild(openDiv);
        } else {
            // 押弦ドット [cite: 485]
            const dotDiv = document.createElement('div');
            dotDiv.className = 'dot';

            // 表示するフレットがlowFretからの相対位置になるように計算
            const displayFret = fret - lowFretValue + 1;

            if (displayFret >= 1 && displayFret <= 5) { // 1フレットから5フレットまで表示
                dotDiv.style.top = `${yPos}px`;
                // フレットの真ん中にドットを表示するため、FretLeftsのインデックスは displayFret
                dotDiv.style.left = `${fretLefts[displayFret]}px`; 
                containerElement.appendChild(dotDiv);
            }
        }
    }
}

/**
 * 進行状態とフレットボード表示を更新するメイン関数 (JavaのJSON応答後の処理を再現)
 * @param {number} newIndex - 新しいコードインデックス
 * @param {string} newProgressionName - 新しい進行名
 * @param {Array<string>} progression - 使用するコード進行の配列
 */
function updateDisplay(newIndex, progression, progressionName) {
    if (!progression || progression.length === 0) {
        // フォールバック処理 (Javaコードに基づく) [cite: 431, 432]
        progression = ["C"];
        progressionName = "C-Default";
        newIndex = 0;
    }

    // 状態更新
    currentProgressionName = progressionName;
    currentIndex = newIndex;
    currentProgressionChords = progression;
    const totalProgressionLength = progression.length;

    // 現在のコード情報取得
    const currentChordName = progression[currentIndex];
    const currentChordInfo = CHORD_DATA_MAP[currentChordName];

    // 次のコード情報取得 (末尾で最初に戻る) [cite: 438, 439]
    const nextIndex = (currentIndex + 1) % totalProgressionLength;
    const nextChordName = progression[nextIndex];
    const nextChordInfo = CHORD_DATA_MAP[nextChordName];

    // DOM要素更新
    document.getElementById('currentChordDisplayName').textContent = currentChordInfo ? currentChordInfo.displayName : 'コードなし';
    document.getElementById('nextChordDisplayName').textContent = nextChordInfo ? nextChordInfo.displayName : '次のコード: ' + nextChordName;

    drawFretboardDots(currentChordInfo, document.getElementById('fretboard-container'), 'current');
    drawFretboardDots(nextChordInfo, document.getElementById('next-fretboard-container'), 'next');

    // プログレスバー更新
    updateProgressBar(currentIndex, totalProgressionLength);
}

/**
 * プログレスバーの更新 (JSPの updateProgressBar を移植)
 * @param {number} index - 現在のインデックス
 * @param {number} length - 進行全長
 */
function updateProgressBar(index, length) {
    const progressBar = document.getElementById('progressBar');
    const totalProgressionLength = length || currentProgressionChords.length;
    
    if (totalProgressionLength === 0) {
        progressBar.style.width = '0%';
        progressBar.textContent = '進行なし';
        return;
    }

    const percentage = ((index + 1) / totalProgressionLength) * 100;
    progressBar.style.width = `${percentage}%`;
    progressBar.textContent = `${index + 1} / ${totalProgressionLength}`;
}

// =======================================================================
// 4. イベントハンドラ (Servletへのリクエスト処理をクライアントサイドの関数呼び出しに置換)
// =======================================================================

/**
 * 進行をリセットまたは変更する
 * @param {string} progressionName - 新しいコード進行名
 */
function initializeProgression(progressionName) {
    let progression = CHORD_PROGRESSIONS_MAP[progressionName];
    
    // ランダム進行の処理 [cite: 425]
    if (progressionName === 'Random' || !progression) {
        progression = generateRandomProgression();
    }
    
    updateDisplay(0, progression, progressionName);
}

/**
 * 次のコードに進む (Javaの next アクションを再現)
 */
function goToNextChord() {
    const total = currentProgressionChords.length;
    // 次のコード (末尾で最初に戻る) [cite: 432]
    const nextIndex = (currentIndex + 1) % total; 
    updateDisplay(nextIndex, currentProgressionChords, currentProgressionName);
}

/**
 * 前のコードに戻る (Javaの prev アクションを再現)
 */
function goToPrevChord() {
    const total = currentProgressionChords.length;
    // 前のコード (先頭で末尾に戻る) [cite: 433]
    const prevIndex = (currentIndex - 1 + total) % total; 
    updateDisplay(prevIndex, currentProgressionChords, currentProgressionName);
}

// 自動更新処理 (JSPのJSブロックから移植) [cite: 350, 368]
function startAutoUpdate() {
    const interval = parseInt(document.getElementById('autoUpdateTime').value, 10);
    stopAutoUpdate(); // 既存のインターバルをクリア
    autoUpdateIntervalId = setInterval(goToNextChord, interval);
    document.getElementById('toggleAutoUpdate').textContent = '一時停止';
}

function stopAutoUpdate() {
    if (autoUpdateIntervalId !== null) {
        clearInterval(autoUpdateIntervalId);
        autoUpdateIntervalId = null;
        document.getElementById('toggleAutoUpdate').textContent = '再生';
    }
}

function toggleAutoUpdate() {
    if (autoUpdateIntervalId === null) {
        startAutoUpdate();
    } else {
        stopAutoUpdate();
    }
}


// =======================================================================
// 5. 初期化とイベントリスナー設定
// =======================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 進行選択プルダウンにオプションを動的に追加
    const progressionSelect = document.getElementById('progressionSelect');
    progressionSelect.innerHTML = '';
    PROGRESSION_NAMES_LIST.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        // "Random"は「ランダム進行」と表示 [cite: 342]
        option.textContent = name === 'Random' ? 'ランダム進行' : name; 
        progressionSelect.appendChild(option);
    });

    // 初期表示
    initializeProgression(currentProgressionName); 
    
    // イベントリスナー設定
    document.getElementById('nextChordButton').addEventListener('click', goToNextChord);
    document.getElementById('prevChordButton').addEventListener('click', goToPrevChord);
    document.getElementById('toggleAutoUpdate').addEventListener('click', toggleAutoUpdate);
    
    // 進行選択フォームの処理 (サーバーリクエストを防止し、JSで処理)
    document.getElementById('progressionForm').addEventListener('submit', (event) => {
        event.preventDefault(); // フォーム送信を阻止
        const selectedProgression = progressionSelect.value;
        initializeProgression(selectedProgression);
    });

    // ランダム進行生成ボタン
    document.getElementById('randomProgressionButton').addEventListener('click', () => {
        progressionSelect.value = 'Random'; // プルダウンを「Random」に合わせる
        initializeProgression('Random');
    });

    // 初期表示時に自動再生を開始（JSPのデフォルト設定が3秒だったため）
    // startAutoUpdate(); // 自動再生が不要であればこの行をコメントアウト
});