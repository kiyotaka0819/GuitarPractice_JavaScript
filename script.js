const progressionSelect = document.getElementById('progression-select');
const startProgressionButton = document.getElementById('start-progression-button');
const nextChordButton = document.getElementById('next-chord-button');
const prevChordButton = document.getElementById('prev-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const currentProgressionNameDisplay = document.getElementById('current-progression-name');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const autoUpdateTimeSelect = document.getElementById('auto-update-time');

let allProgressions = {};
let currentProgression = null;
let currentChordIndex = 0;
let autoUpdateInterval = null;
let isAutoUpdating = false;

// フレットボードの描画パラメータ
const FRET_POSITIONS = [7.5, 23.5, 38.5, 53.0, 67.0, 80.5]; // 1Fから6Fまでの垂直位置 (ネックからフレットの中心)
const STRING_POSITIONS = [4.5, 20.5, 36.5, 52.5, 68.5, 84.5]; // E6からE1までの水平位置

// =========================================================================
// データ読み込み
// =========================================================================

async function loadProgressions() {
    try {
        const response = await fetch('progressions.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allProgressions = await response.json();
        populateProgressionSelect();
    } catch (error) {
        console.error("Error loading progressions:", error);
        document.getElementById('error-container').style.display = 'block';
    }
}

function populateProgressionSelect() {
    for (const name in allProgressions) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        progressionSelect.appendChild(option);
    }
    // 初回ロード時に最初のコード進行で開始
    if (Object.keys(allProgressions).length > 0) {
        const firstProgressionName = Object.keys(allProgressions)[0];
        startProgression(firstProgressionName);
    }
}

// =========================================================================
// フレットボード描画
// =========================================================================

function drawFretboard(containerId, chord) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // コンテナ内の既存の要素をクリア
    container.innerHTML = '';

    // フレットボードの画像を設定
    // ファイル名が 'fretboard.jpg' と 'fretboard2.jpg' のどちらかであることを前提とする
    const imageName = (chord.fret > 4) ? 'fretboard2.jpg' : 'fretboard.jpg';
    container.style.backgroundImage = `url(${imageName})`;

    // FRET_POSITIONSとSTRING_POSITIONSの範囲をチェック
    const isStandardFret = (chord.fret <= 4);

    // フレット番号ラベルの描画
    if (!isStandardFret && chord.fret > 0) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.textContent = chord.fret;
        // ポジションは画像によって調整が必要
        fretLabel.style.left = '4%'; // 適当な調整
        fretLabel.style.bottom = '4%'; // 適当な調整
        container.appendChild(fretLabel);
    }
    
    // ドット、開放弦、ミュートの描画
    // dot.positionは [弦番号(0-5), フレット番号(0-5)] の配列。0:開放弦 1-5:フレット
    chord.dots.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        
        // 弦の位置 (E6:0, A:1, D:2, G:3, B:4, E1:5)
        dot.style.left = `${STRING_POSITIONS[stringIndex]}%`;

        if (fret === 0) {
            // 開放弦 (ネック部分)
            dot.className = 'open-mark';
            dot.style.top = '4.5%'; 
            container.appendChild(dot);
            
        } else if (fret === -1) {
            // ミュート (Xマーク)
            dot.className = 'mute-mark';
            dot.textContent = 'X';
            dot.style.top = '4.5%';
            container.appendChild(dot);

        } else if (fret >= 1 && fret <= 6) { 
            // 押弦 (1Fから6F)
            dot.className = 'dot';

            // フレットの位置 (FRET_POSITIONSは1Fから6Fまでの位置情報)
            dot.style.top = `${FRET_POSITIONS[fret - 1]}%`;
            container.appendChild(dot);
        }
    });
}

// =========================================================================
// ロジック/イベントハンドラ
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

    // ★★★ 修正箇所: 進捗表示を削除してコード名のみを表示 ★★★
    currentName.textContent = `${currentChord.name}`; 
    
    nextName.textContent = `${nextChord.name}`; 

    drawFretboard('fretboard-container', currentChord);
    drawFretboard('next-fretboard-container', nextChord);

    // プログレスバーの更新 (進捗表示はここで十分)
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
        // 再生ボタンを押した瞬間にも更新
        nextChord();
    }
    isAutoUpdating = !isAutoUpdating;
}

function generateRandomProgression() {
    const allNames = Object.keys(allProgressions);
    if (allNames.length === 0) return;

    // ランダムな4つのコード進行からコードをランダムに選ぶ
    const numSteps = 4;
    const randomChords = [];

    for (let i = 0; i < numSteps; i++) {
        const randomProgressionName = allNames[Math.floor(Math.random() * allNames.length)];
        const prog = allProgressions[randomProgressionName];
        const randomChord = prog.chords[Math.floor(Math.random() * prog.chords.length)];
        randomChords.push(randomChord);
    }

    const randomProgName = `ランダム (${randomChords.map(c => c.name).join('-')})`;
    
    // 一時的なランダム進行を生成
    allProgressions[randomProgName] = {
        chords: randomChords
    };
    
    // セレクトボックスに表示せず、即座に開始
    startProgression(randomProgName);
}


// =========================================================================
// イベントリスナー設定
// =========================================================================

document.addEventListener('DOMContentLoaded', loadProgressions);

startProgressionButton.addEventListener('click', () => {
    startProgression(progressionSelect.value);
    if (isAutoUpdating) { // 進行が変わったら自動更新をリセット
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
    if (isAutoUpdating) { // 進行が変わったら自動更新をリセット
        toggleAutoUpdate();
    }
});

toggleAutoUpdateButton.addEventListener('click', toggleAutoUpdate);