const progressionSelect = document.getElementById('progression-select');
const startProgressionButton = document.getElementById('start-progression-button');
const nextChordButton = document.getElementById('next-chord-button');
const prevChordButton = document.getElementById('prev-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const autoUpdateTimeSelect = document.getElementById('auto-update-time');
const errorContainer = document.getElementById('error-container');

let allProgressions = {}; 
let allChords = {};       
let currentProgression = null;
let currentChordIndex = 0;
let autoUpdateInterval = null;
let isAutoUpdating = false;

// =========================================================================
// ★★★ 最終座標調整エリア (変更なし) ★★★
// =========================================================================

// フレットボードの描画パラメータ
const FRET_POSITIONS = [22, 43, 65, 78, 88, 95]; 
const Y_AXIS_STRING_POSITIONS = [71.5, 63.5, 56.5, 49, 41, 34.5]; 
const OPEN_MUTE_X_POSITION = '3%';

// =========================================================================
// GAS接続とデータ整形ロジック (変更なし)
// =========================================================================

// ★★★ ここにデプロイしたGASのURLを入れるんやで！ ★★★
const GAS_URL = 'https://script.google.com/macros/s/AKfycby7RvFKpps4GA9l_AW7yrjEp5FVW-F8_jVdfG5zUdzNKaIkkvzEPfbCE_egifIfC6O_wA/exec'; 

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

        return data; 
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
    progressionSelect.innerHTML = ''; 
    for (const name in allProgressions) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        progressionSelect.appendChild(option);
    }
}


// =========================================================================
// フレットボード描画
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
        container.textContent = 'コードデータなし';
        return;
    }

    const lowFret = chordData.lowFret;
    const fretPositions = chordData.fretPositions; 

    // 画像切り替えロジック (lowFretが2以上でfretboard2.jpgに切り替え)
    const imageName = (lowFret >= 2) ? 'fretboard2.jpg' : 'fretboard.jpg';
    container.style.backgroundImage = `url(${imageName})`;

    // フレット番号ラベルの描画
    if (lowFret >= 2) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.textContent = lowFret;
        
        // ★★★ 修正箇所: 基準フレットラベルの位置を1フレット目の下に移動 ★★★
        fretLabel.style.left = '8%'; // 1フレット目の左側に寄せる調整値
        fretLabel.style.bottom = '4%'; 
        container.appendChild(fretLabel);
    }
    
    // ドット、開放弦、ミュートの描画
    fretPositions.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        
        // Y軸の位置は修正された定数を使用
        dot.style.top = `${Y_AXIS_STRING_POSITIONS[stringIndex]}%`;
        
        // 描画するフレット位置を計算 (lowFretからの相対位置)
        // 修正済み: + 1 を削除して、正しい相対フレット位置を取得
        const displayFret = (fret === -1 || fret === 0) ? fret : (fret - lowFret); 

        if (displayFret === 0) {
            // 開放弦 (ネック部分)
            dot.className = 'open-mark';
            dot.style.left = OPEN_MUTE_X_POSITION; 
            container.appendChild(dot);
            
        } else if (displayFret === -1) {
            // ミュート (Xマーク)
            dot.className = 'mute-mark';
            dot.textContent = '×';
            dot.style.left = OPEN_MUTE_X_POSITION;
            container.appendChild(dot);

        } else if (displayFret >= 1 && displayFret <= 6) { 
            // 押弦 (1Fから6F)
            dot.className = 'dot';
            // FRET_POSITIONSのインデックスは 1F の時 0
            dot.style.left = `${FRET_POSITIONS[displayFret - 1]}%`;
            container.appendChild(dot);
        }
    });
}

// =========================================================================
// ロジック/イベントハンドラ (変更なし)
// =========================================================================

function startProgression(progressionName) {
    const chordNames = allProgressions[progressionName];
    if (!chordNames || chordNames.length === 0) return;
    
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
 */
function updateChordDisplay(progression, index) {
    const currentChordIndex = index;
    const currentChordName = progression[currentChordIndex];
    const nextChordName = progression[(currentChordIndex + 1) % progression.length];

    const currentNameElement = document.getElementById('current-chord-displayname');
    const nextNameElement = document.getElementById('next-chord-displayname');

    currentNameElement.textContent = allChords[currentChordName]?.displayName || currentChordName; 
    nextNameElement.textContent = allChords[nextChordName]?.displayName || nextChordName; 

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
        nextChord();
        autoUpdateInterval = setInterval(nextChord, intervalTime);
        toggleAutoUpdateButton.textContent = '一時停止';
    }
    isAutoUpdating = !isAutoUpdating;
}

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
    
    allProgressions[randomProgName] = randomChordNames;
    
    populateProgressionSelect();
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
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        isAutoUpdating = false;
        toggleAutoUpdateButton.textContent = '再生';
    }
});

nextChordButton.addEventListener('click', () => {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    isAutoUpdating = false;
    toggleAutoUpdateButton.textContent = '再生';
    nextChord();
});

prevChordButton.addEventListener('click', () => {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    isAutoUpdating = false;
    toggleAutoUpdateButton.textContent = '再生';
    prevChord();
});

randomProgressionButton.addEventListener('click', () => {
    generateRandomProgression();
    if (isAutoUpdating) { 
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        isAutoUpdating = false;
        toggleAutoUpdateButton.textContent = '再生';
    }
});

toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);