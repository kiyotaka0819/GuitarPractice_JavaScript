const progressionSelect = document.getElementById('progression-select');
const startProgressionButton = document.getElementById('start-progression-button');
const nextChordButton = document.getElementById('next-chord-button');
const prevChordButton = document.getElementById('prev-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const autoUpdateTimeSelect = document.getElementById('auto-update-time');
const errorContainer = document.getElementById('error-container');

let allProgressions = {}; // 進行名 => [コード名, ...]
let allChords = {};       // コード名 => { displayName, lowFret, fretPositions: [E6, ..., E1] }
let currentProgression = null;
let currentChordIndex = 0;
let autoUpdateInterval = null;
let isAutoUpdating = false;

// フレットボードの描画パラメータ (変更なし)
const FRET_POSITIONS = [23, 43, 65, 78, 88, 95]; 
const Y_AXIS_STRING_POSITIONS = [70.5, 63.5, 56.5, 49, 41, 34.5];

// =========================================================================
// ★★★ GAS接続とデータ整形ロジック ★★★
// =========================================================================

// ★★★ ここにデプロイしたGASのURLを入れるんやで！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwZizOpDP99I4mKEujhbXGEAory8rEA5t4e9XsVw8we/dev'; 

// GASからデータを取得する非同期関数
async function fetchDataFromGAS() {
    try {
        const response = await fetch(GAS_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.message || data.error);
        }

        return data; // { chords: {...}, progressions: {...} } 形式のデータ
    } catch (error) {
        console.error("GASからのデータ取得中にエラー:", error);
        errorContainer.textContent = `データ読み込みエラー: ${error.message}`;
        errorContainer.style.display = 'block';
        return null;
    }
}

// データの読み込みと初期表示
async function loadProgressions() {
    const data = await fetchDataFromGAS();
    
    if (data && data.chords && data.progressions) {
        allChords = data.chords;
        
        // GASから取得したprogressions (進行名 => [コード名, ...]) をそのまま使用
        allProgressions = data.progressions; 
        
        populateProgressionSelect();
        errorContainer.style.display = 'none';

        if (Object.keys(allProgressions).length > 0) {
            const firstProgressionName = Object.keys(allProgressions)[0];
            startProgression(firstProgressionName);
        }
    }
}

function populateProgressionSelect() {
    // 既存のオプションをクリア
    progressionSelect.innerHTML = ''; 
    for (const name in allProgressions) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        progressionSelect.appendChild(option);
    }
}


// =========================================================================
// フレットボード描画 (コードデータをGASの形式に合わせて調整)
// =========================================================================

/**
 * 取得したコードデータ（GAS形式）を元に描画する
 * @param {string} containerId - 描画先のDOM ID
 * @param {string} chordName - 描画するコード名
 */
function drawFretboard(containerId, chordName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    const chordData = allChords[chordName];
    if (!chordData) {
        // データがない場合はエラー表示か空欄
        container.textContent = 'コードデータなし';
        return;
    }

    const lowFret = chordData.lowFret;
    const fretPositions = chordData.fretPositions; // [E6, A, D, G, B, E1]

    // lowFret > 0 なら 'fretboard2.jpg' (高いフレット用)
    const imageName = (lowFret > 0) ? 'fretboard2.jpg' : 'fretboard.jpg';
    container.style.backgroundImage = `url(${imageName})`;

    // フレット番号ラベルの描画
    if (lowFret > 0) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.textContent = lowFret;
        // X/Y軸が入れ替わった後の位置で調整
        fretLabel.style.left = '4%'; 
        fretLabel.style.bottom = '4%'; 
        container.appendChild(fretLabel);
    }
    
    // ドット、開放弦、ミュートの描画
    // fretPositions: [E6, A, D, G, B, E1]
    fretPositions.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        
        // Y_AXIS_STRING_POSITIONSを直接使用 (E6(index 0)が70.5%で下に来る)
        dot.style.top = `${Y_AXIS_STRING_POSITIONS[stringIndex]}%`;
        
        // 描画するフレット位置を計算 (lowFretからの相対位置)
        const displayFret = (fret === -1 || fret === 0) ? fret : (fret - lowFret) + 1;

        if (displayFret === 0) {
            // 開放弦 (ネック部分)
            dot.className = 'open-mark';
            dot.style.left = '4%'; 
            container.appendChild(dot);
            
        } else if (displayFret === -1) {
            // ミュート (Xマーク)
            dot.className = 'mute-mark';
            dot.textContent = '×';
            dot.style.left = '4%';
            container.appendChild(dot);

        } else if (displayFret >= 1 && displayFret <= 6) { 
            // 押弦 (1Fから6F)
            dot.className = 'dot';
            dot.style.left = `${FRET_POSITIONS[displayFret - 1]}%`;
            container.appendChild(dot);
        }
    });
}

// =========================================================================
// ロジック/イベントハンドラ (コードのデータ構造に合わせて修正)
// =========================================================================

function startProgression(progressionName) {
    const chordNames = allProgressions[progressionName];
    if (!chordNames || chordNames.length === 0) return;
    
    // currentProgression はコード名の配列 (例: ['C', 'G', 'Am', ...])
    currentProgression = chordNames;
    currentChordIndex = 0;
    updateChordDisplay(currentProgression, currentChordIndex);
}

function nextChord() {
    if (!currentProgression) return;
    
    currentChordIndex = (currentChordIndex + 1) % currentProgression.length;
    updateChordDisplay(currentProgression, currentChordIndex);
}

function prevChord() {
    if (!currentProgression) return;
    
    currentChordIndex = (currentChordIndex - 1 + currentProgression.length) % currentProgression.length;
    updateChordDisplay(currentProgression, currentChordIndex);
}

/**
 * 画面表示を更新する
 * @param {string[]} progression - コード名の配列 (例: ['C', 'G', 'Am', ...])
 * @param {number} index - 現在のインデックス
 */
function updateChordDisplay(progression, index) {
    const currentChordIndex = index;
    const currentChordName = progression[currentChordIndex];
    const nextChordName = progression[(currentChordIndex + 1) % progression.length];

    const currentNameElement = document.getElementById('current-chord-displayname');
    const nextNameElement = document.getElementById('next-chord-displayname');

    // GASから取得したデータを使う
    currentNameElement.textContent = allChords[currentChordName]?.displayName || currentChordName; 
    nextNameElement.textContent = allChords[nextChordName]?.displayName || nextChordName; 

    // drawFretboard にはコード名 (文字列) を渡す
    drawFretboard('fretboard-container', currentChordName);
    drawFretboard('next-fretboard-container', nextChordName);

    const progressBar = document.getElementById('progress-bar');
    const progressWidth = ((currentChordIndex + 1) / progression.length) * 100;
    progressBar.style.width = `${progressWidth}%`;
    progressBar.textContent = `${currentChordIndex + 1}/${progression.length}`;
}

function toggleAutoUpdate() {
    if (!currentProgression) {
        alert("コード進行を選択して開始してください。");
        return;
    }

    if (isAutoUpdating) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        toggleAutoUpdateButton.textContent = '再生';
    } else {
        const intervalTime = parseInt(autoUpdateTimeSelect.value);
        // nextChord() を1回呼んで、すぐに次のコードを表示してからインターバルを開始
        nextChord();
        autoUpdateInterval = setInterval(nextChord, intervalTime);
        toggleAutoUpdateButton.textContent = '一時停止';
    }
    isAutoUpdating = !isAutoUpdating;
}

// ランダム進行は、GASから取得したコード名のプールを使って作成するように修正
function generateRandomProgression() {
    const allChordNames = Object.keys(allChords);
    if (allChordNames.length === 0) {
        alert("まだコードデータが読み込まれていません。");
        return;
    }

    const numSteps = 4;
    const randomChordNames = [];

    for (let i = 0; i < numSteps; i++) {
        const randomChordName = allChordNames[Math.floor(Math.random() * allChordNames.length)];
        randomChordNames.push(randomChordName);
    }

    const randomProgName = `ランダム (${randomChordNames.join('-')})`;
    
    // 新しいランダム進行を一時的にallProgressionsに追加する
    allProgressions[randomProgName] = randomChordNames;
    
    // セレクトボックスを更新
    populateProgressionSelect();
    
    // 新しい進行を選択
    progressionSelect.value = randomProgName;

    startProgression(randomProgName);
}


// =========================================================================
// イベントリスナー設定 (変更なし)
// =========================================================================

document.addEventListener('DOMContentLoaded', loadProgressions);

startProgressionButton.addEventListener('click', () => {
    startProgression(progressionSelect.value);
    if (isAutoUpdating) { 
        // 自動更新中に新しい進行を開始したら、インターバルをリセット
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        isAutoUpdating = false;
        toggleAutoUpdateButton.textContent = '再生';
    }
});

nextChordButton.addEventListener('click', () => {
    // ボタン操作時は自動更新を停止
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    isAutoUpdating = false;
    toggleAutoUpdateButton.textContent = '再生';
    nextChord();
});

prevChordButton.addEventListener('click', () => {
    // ボタン操作時は自動更新を停止
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    isAutoUpdating = false;
    toggleAutoUpdateButton.textContent = '再生';
    prevChord();
});

randomProgressionButton.addEventListener('click', () => {
    generateRandomProgression();
    // ランダム生成後は自動更新を停止
    if (isAutoUpdating) { 
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        isAutoUpdating = false;
        toggleAutoUpdateButton.textContent = '再生';
    }
});

toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);