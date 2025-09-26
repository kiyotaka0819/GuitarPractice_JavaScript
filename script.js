// script.js の全文

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
// GAS接続設定 (ここが重要！)
// =========================================================================

// ★★★ Googleusercontent.com に手動で書き換え済み！CORS回避の裏技URLや！ ★★★
const GAS_URL = 'https://script.googleusercontent.com/macros/s/AKfycbyGqOY--jN3pHzbvtJDRd6JLHNiRwBPHkIZA5Q4F_r3uZvIyZcso-iDkPJDYPf5fLotbw/exec'; 

const CACHE_KEY = 'chordAppCache';
const CACHE_TTL = 3600000; // キャッシュ有効期間: 1時間 (ミリ秒)

// フレットボードの描画パラメータ (変更なし)
const FRET_POSITIONS = [22, 43, 65, 78, 88, 95]; 
const Y_AXIS_STRING_POSITIONS = [71.5, 63.5, 56.5, 49, 41, 34.5]; 
const OPEN_MUTE_X_POSITION = '3%';

// =========================================================================
// GAS接続とデータ整形ロジック (リダイレクト追跡オプション追加)
// =========================================================================

async function fetchDataFromGAS() {
    // 1. LocalStorageからキャッシュを確認
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_KEY + 'Timestamp');

    if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp) < CACHE_TTL)) {
        console.log("✅ LocalStorageからキャッシュデータを読み込みました。");
        return JSON.parse(cachedData);
    }
    
    // 2. キャッシュがない、または期限切れの場合、GASからデータを取得する
    console.log("❌ キャッシュ期限切れ、または初回アクセス。GASからデータを取得します...");
    try {
        const response = await fetch(GAS_URL, {
             // ★★★ リダイレクトの追跡を明示的に指定して307エラーを回避する！ ★★★
             redirect: 'follow' 
        });

        if (!response.ok) {
            // CORSエラーの場合、ここで止まることが多い
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.message || data.error);
        }

        // 3. 成功したらキャッシュを更新する
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_KEY + 'Timestamp', Date.now().toString());
        
        return data; 
    } catch (error) {
        console.error("GASからのデータ取得中にエラー:", error);
        errorContainer.textContent = `データ読み込みエラー: ${error.message}`;
        errorContainer.style.display = 'block';

        // 4. 古いキャッシュをフォールバックとして使用
        if (cachedData) {
            console.warn("古いキャッシュを使用して続行します。");
            return JSON.parse(cachedData);
        }
        
        return null;
    }
}

// データの読み込みと初期表示 (変更なし)
async function loadProgressions() {
    const data = await fetchDataFromGAS();
    
    if (data && data.chords && data.progressions) {
        allChords = data.chords;
        allProgressions = data.progressions; 
        
        populateProgressionSelect();
        errorContainer.style.display = 'none';

        const tempProgressionName = localStorage.getItem('tempProgressionSelection');
        
        if (tempProgressionName && allProgressions[tempProgressionName]) {
            startProgression(tempProgressionName);
            progressionSelect.value = tempProgressionName; 
            localStorage.removeItem('tempProgressionSelection'); 
        } else if (Object.keys(allProgressions).length > 0) {
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
// フレットボード描画 (変更なし)
// =========================================================================

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

    const imageName = (lowFret >= 2) ? 'fretboard2.jpg' : 'fretboard.jpg';
    container.style.backgroundImage = `url(${imageName})`;

    if (lowFret >= 2) {
        const fretLabel = document.createElement('div');
        fretLabel.className = 'fret-label';
        fretLabel.textContent = lowFret;
        fretLabel.style.left = '10%'; 
        fretLabel.style.bottom = '4%'; 
        container.appendChild(fretLabel);
    }
    
    fretPositions.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        dot.style.top = `${Y_AXIS_STRING_POSITIONS[stringIndex]}%`;
        const displayFret = (fret === -1 || fret === 0) ? fret : (fret - lowFret); 

        if (displayFret === 0) {
            dot.className = 'open-mark';
            dot.style.left = OPEN_MUTE_X_POSITION; 
            container.appendChild(dot);
            
        } else if (displayFret === -1) {
            dot.className = 'mute-mark';
            dot.textContent = '×';
            dot.style.left = OPEN_MUTE_X_POSITION;
            container.appendChild(dot);

        } else if (displayFret >= 1 && displayFret <= 6) { 
            dot.className = 'dot';
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