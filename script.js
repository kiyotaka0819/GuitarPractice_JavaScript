const progressionSelect = document.getElementById('progression-select');
const startProgressionButton = document.getElementById('start-progression-button');
const nextChordButton = document.getElementById('next-chord-button');
const prevChordButton = document.getElementById('prev-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const currentProgressionNameDisplay = document.getElementById('current-progression-name');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const autoUpdateTimeSelect = document.getElementById('auto-update-time');
const errorContainer = document.getElementById('error-container');

let allProgressions = {};
let currentProgression = null;
let currentChordIndex = 0;
let autoUpdateInterval = null;
let isAutoUpdating = false;

// フレットボードの描画パラメータ

// 縦軸（Y軸）に使うべき定数：フレットの位置 (1F→6F)
const FRET_POSITIONS = [15, 30, 45, 60, 75, 88]; 

// 横軸（X軸）に使うべき定数：弦の位置 (E6→E1)
const STRING_POSITIONS = [5.5, 21.5, 37.5, 53.5, 69.5, 85.5]; 

// =========================================================================
// テスト用ダミーデータ (変更なし)
// =========================================================================

const DUMMY_PROGRESSIONS = {
  "C-G-Am-Em-F-C-F-G (王道進行)": {
    "chords": [
      { "name": "C", "fret": 0, "dots": [ -1, 3, 2, 0, 1, 0 ] },
      { "name": "G", "fret": 0, "dots": [ 3, 2, 0, 0, 0, 3 ] },
      { "name": "Am", "fret": 0, "dots": [ -1, 0, 2, 2, 1, 0 ] },
      { "name": "Em", "fret": 0, "dots": [ 0, 2, 2, 0, 0, 0 ] },
      { "name": "F", "fret": 1, "dots": [ 1, 3, 3, 2, 1, 1 ] },
      { "name": "C", "fret": 0, "dots": [ -1, 3, 2, 0, 1, 0 ] },
      { "name": "F", "fret": 1, "dots": [ 1, 3, 3, 2, 1, 1 ] },
      { "name": "G", "fret": 0, "dots": [ 3, 2, 0, 0, 0, 3 ] }
    ]
  },
  "Am-G-C-F (カノン進行)": {
    "chords": [
      { "name": "Am", "fret": 0, "dots": [ -1, 0, 2, 2, 1, 0 ] },
      { "name": "G", "fret": 0, "dots": [ 3, 2, 0, 0, 0, 3 ] },
      { "name": "C", "fret": 0, "dots": [ -1, 3, 2, 0, 1, 0 ] },
      { "name": "F", "fret": 1, "dots": [ 1, 3, 3, 2, 1, 1 ] }
    ]
  },
  "Dm7-G7-Cmaj7-Fmaj7 (ジャズ進行)": {
    "chords": [
      { "name": "Dm7", "fret": 5, "dots": [ -1, 5, 7, 5, 6, 5 ] },
      { "name": "G7", "fret": 3, "dots": [ 3, 5, 3, 4, 3, 3 ] },
      { "name": "Cmaj7", "fret": 3, "dots": [ -1, 3, 5, 4, 5, 3 ] },
      { "name": "Fmaj7", "fret": 1, "dots": [ 1, 3, 3, 2, 1, 0 ] }
    ]
  }
};


async function loadProgressions() {
    try {
        allProgressions = DUMMY_PROGRESSIONS;
        populateProgressionSelect();
        errorContainer.style.display = 'none';
    } catch (error) {
        console.error("Error loading dummy progressions:", error);
        errorContainer.style.display = 'block';
    }
}

function populateProgressionSelect() {
    for (const name in allProgressions) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        progressionSelect.appendChild(option);
    }
    if (Object.keys(allProgressions).length > 0) {
        const firstProgressionName = Object.keys(allProgressions)[0];
        startProgression(firstProgressionName);
    }
}

// =========================================================================
// フレットボード描画 (縦横軸の完全入れ替え修正)
// =========================================================================

function drawFretboard(containerId, chord) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    
    const imageName = (chord.fret > 4) ? 'fretboard2.jpg' : 'fretboard.jpg';
    container.style.backgroundImage = `url(${imageName})`;

    const isStandardFret = (chord.fret <= 4);

    // フレット番号ラベルの描画
    if (!isStandardFret && chord.fret > 0) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.textContent = chord.fret;
        // ラベルの位置も入れ替わった前提で調整
        fretLabel.style.left = '4%'; 
        fretLabel.style.bottom = '4%'; 
        container.appendChild(fretLabel);
    }
    
    // ドット、開放弦、ミュートの描画
    // 配列: [E6, A, D, G, B, E1]
    chord.dots.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        
        // ★★★ X軸 (left) に FRET_POSITIONS を使う（フレット番号のズレを修正）★★★
        // ここが縦横入れ替わりの核心！
        
        if (fret === 0) {
            // 開放弦 (ネック部分)
            dot.className = 'open-mark';
            
            // X軸（横位置）は、弦の位置（STRING_POSITIONS）をそのまま使う。
            // Y軸（縦位置）は、開放弦なので、一番上に固定（0%）。
            dot.style.left = `${STRING_POSITIONS[stringIndex]}%`;
            dot.style.top = '0%'; 
            container.appendChild(dot);
            
        } else if (fret === -1) {
            // ミュート (Xマーク)
            dot.className = 'mute-mark';
            dot.textContent = 'X';
            
            // X軸（横位置）は、弦の位置（STRING_POSITIONS）をそのまま使う。
            // Y軸（縦位置）は、ミュートなので、一番上に固定（0%）。
            dot.style.left = `${STRING_POSITIONS[stringIndex]}%`;
            dot.style.top = '0%';
            container.appendChild(dot);

        } else if (fret >= 1 && fret <= 6) { 
            // 押弦 (1Fから6F)
            dot.className = 'dot';
            
            // ★★★ X軸（横位置）は、弦の位置（STRING_POSITIONS）をそのまま使う。 ★★★
            dot.style.left = `${STRING_POSITIONS[stringIndex]}%`;

            // ★★★ Y軸（縦位置）は、フレットの位置（FRET_POSITIONS）を使う。 ★★★
            dot.style.top = `${FRET_POSITIONS[fret - 1]}%`;
            
            container.appendChild(dot);
        }
    });
}

// =========================================================================
// ロジック/イベントハンドラ (変更なし)
// =========================================================================

function startProgression(progressionName) {
    if (!allProgressions[progressionName]) return;
    
    currentProgression = allProgressions[progressionName];
    currentChordIndex = 0;
    currentProgressionNameDisplay.textContent = progressionName;
    updateChordDisplay(currentProgression, currentChordIndex);
}

function nextChord() {
    if (!currentProgression) return;
    
    currentChordIndex = (currentChordIndex + 1) % currentProgression.chords.length;
    updateChordDisplay(currentProgression, currentChordIndex);
}

function prevChord() {
    if (!currentProgression) return;
    
    currentChordIndex = (currentChordIndex - 1 + currentProgression.chords.length) % currentProgression.chords.length;
    updateChordDisplay(currentProgression, currentChordIndex);
}

function updateChordDisplay(progression, index) {
    const currentChordIndex = index;
    const currentChord = progression.chords[currentChordIndex];
    const nextChord = progression.chords[(currentChordIndex + 1) % progression.chords.length];

    const currentName = document.getElementById('current-chord-displayname');
    const nextName = document.getElementById('next-chord-displayname');

    currentName.textContent = `${currentChord.name}`; 
    nextName.textContent = `${nextChord.name}`; 

    drawFretboard('fretboard-container', currentChord);
    drawFretboard('next-fretboard-container', nextChord);

    const progressBar = document.getElementById('progress-bar');
    const progressWidth = ((currentChordIndex + 1) / progression.chords.length) * 100;
    progressBar.style.width = `${progressWidth}%`;
    progressBar.textContent = `${currentChordIndex + 1}/${progression.chords.length}`;
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
        autoUpdateInterval = setInterval(nextChord, intervalTime);
        toggleAutoUpdateButton.textContent = '一時停止';
        nextChord();
    }
    isAutoUpdating = !isAutoUpdating;
}

function generateRandomProgression() {
    const allNames = Object.keys(allProgressions);
    if (allNames.length === 0) return;

    const numSteps = 4;
    const randomChords = [];

    for (let i = 0; i < numSteps; i++) {
        const randomProgressionName = allNames[Math.floor(Math.random() * allNames.length)];
        const prog = allProgressions[randomProgressionName];
        const randomChord = prog.chords[Math.floor(Math.random() * prog.chords.length)];
        randomChords.push(randomChord);
    }

    const randomProgName = `ランダム (${randomChords.map(c => c.name).join('-')})`;
    
    allProgressions[randomProgName] = {
        chords: randomChords
    };
    
    startProgression(randomProgName);
}


// =========================================================================
// イベントリスナー設定 (変更なし)
// =========================================================================

document.addEventListener('DOMContentLoaded', loadProgressions);

startProgressionButton.addEventListener('click', () => {
    startProgression(progressionSelect.value);
    if (isAutoUpdating) { 
        toggleAutoUpdate();
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
        toggleAutoUpdate();
    }
});

toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);