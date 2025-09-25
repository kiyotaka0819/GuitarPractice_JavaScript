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
// ★★★ 最終調整: あんたの理想値に合わせて修正 ★★★

// X軸（left）に使うべき定数：フレットの位置 (1F→6F)
// あんたのデータ: 1F=23%, 2F=43%, 3F=65% を基に調整
const FRET_POSITIONS = [23, 43, 65, 78, 88, 95]; 

// Y軸（top）に使うべき定数：弦の位置 (E6→E1) ※描画ロジックで逆順に使う
// あんたのデータ: E6=70.5%, A=63.5%, D=56.5%, G=34.5%, B=41%, E1=49% 
// Y軸（top）は、弦の位置を逆順に使った配列のインデックスに対応しとるため、
// 描画コード内で`reversedStringPositions[stringIndex]`として使われとる。
// E6: index 0 -> reversed[0] -> top 70.5% (E1) -> これがおかしい。

// 以前のロジックを維持しつつ、理想値に近づける
// E6 -> 85.5% (一番下), E1 -> 5.5% (一番上) の想定で、間を調整
const STRING_POSITIONS = [5.5, 21.5, 37.5, 53.5, 69.5, 85.5]; 
// ★★★ Y軸の調整: 描画ロジックが複雑なため、STRING_POSITIONSの定義自体を再調整 ★★★
// あんたの理想値が、[E1, B, G, D, A, E6] の並びで上から順に並んどるように見える。

// E1: 49%, B: 41%, G: 34.5%, D: 56.5%, A: 63.5%, E6: 70.5% の順に定義
const Y_AXIS_STRING_POSITIONS = [70.5, 63.5, 56.5, 49, 41, 34.5];


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
        // X/Y軸が入れ替わった後の位置で調整
        fretLabel.style.left = '4%'; 
        fretLabel.style.bottom = '4%'; 
        container.appendChild(fretLabel);
    }
    
    // ドット、開放弦、ミュートの描画
    // E6(index 0)が一番下(70.5%)に来るように、Y_AXIS_STRING_POSITIONSを逆順に使う必要があったが、
    // ここでY_AXIS_STRING_POSITIONSを[E6, A, D, G, B, E1]の順で定義し直すことで、逆順参照を避ける
    
    const REVERSED_STRING_POSITIONS_FOR_TOP = [...Y_AXIS_STRING_POSITIONS].reverse();

    // 配列: [E6, A, D, G, B, E1]
    chord.dots.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        
        // ★★★ Y軸（top）に、弦の位置（Y_AXIS_STRING_POSITIONS）を使う（X/Y反転）★★★
        // E6がtop: 70.5% (下)、E1がtop: 34.5% (上) になるように、配列を逆順に参照
        dot.style.top = `${REVERSED_STRING_POSITIONS_FOR_TOP[stringIndex]}%`;
        
        if (fret === 0) {
            // 開放弦 (ネック部分)
            dot.className = 'open-mark';
            
            // X軸（left）は、開放弦なので、一番左に固定（4%）。
            dot.style.left = '4%'; 
            container.appendChild(dot);
            
        } else if (fret === -1) {
            // ミュート (Xマーク)
            dot.className = 'mute-mark';
            dot.textContent = '×';
            
            // X軸（left）は、ミュートなので、一番左に固定（5%）。
            dot.style.left = '5%';
            container.appendChild(dot);

        } else if (fret >= 1 && fret <= 6) { 
            // 押弦 (1Fから6F)
            dot.className = 'dot';
            
            // ★★★ X軸（left）は、フレットの位置（FRET_POSITIONS）を使う。 ★★★
            dot.style.left = `${FRET_POSITIONS[fret - 1]}%`;
            
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