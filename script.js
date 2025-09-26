// script.js の全文 (JSONP & バレーコード描画ロジック修正)

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
// GAS接続設定
// =========================================================================

// 標準GAS URL (JSONPはCORSの影響を受けないので、このURLでOK)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzjGexgyNuyPOp2fNMCMztMa9kiuoO8TmQRT2TeJbnzWb3mpXN0NuO4KAGHrPLKprukaQ/exec'; 

const CACHE_KEY = 'chordAppCache';
const CACHE_TTL = 3600000; // キャッシュ有効期間: 1時間 (ミリ秒)

// =========================================================================
// フレットボードの描画パラメータ
// =========================================================================
const FRET_POSITIONS = [22, 43, 65, 78, 88, 95]; 
const Y_AXIS_STRING_POSITIONS = [71.5, 63.5, 56.5, 49, 41, 34.5]; 

// 開放弦/ミュートのX軸位置 (前の検証で調整した値)
const OPEN_MUTE_X_POSITION = '4%'; 


// =========================================================================
// GAS接続とデータ整形ロジック (JSONPでデータ取得)
// =========================================================================

async function fetchDataFromGAS() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_KEY + 'Timestamp');

    if (cachedData && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp) < CACHE_TTL)) {
        console.log("✅ LocalStorageからキャッシュデータを読み込みました。");
        return JSON.parse(cachedData);
    }
    
    console.log("❌ キャッシュ期限切れ、または初回アクセス。JSONPでGASからデータを取得します...");
    
    return new Promise((resolve, reject) => {
        const callbackName = 'gasCallback_' + Date.now();
        window[callbackName] = (data) => {
            delete window[callbackName]; 
            script.remove();             
            
            if (data.error) {
                reject(new Error(data.message || data.error));
                return;
            }
            localStorage.setItem(CACHE_KEY, JSON.stringify(data));
            localStorage.setItem(CACHE_KEY + 'Timestamp', Date.now().toString());
            resolve(data);
        };

        const script = document.createElement('script');
        script.src = `${GAS_URL}?callback=${callbackName}`; 
        
        script.onerror = () => {
             delete window[callbackName];
             script.remove();
             reject(new Error("JSONPリクエストが失敗しました。GASのURLまたはデプロイを確認してください。"));
        };
        
        document.head.appendChild(script);
    })
    .catch(error => {
        console.error("GASからのデータ取得中にエラー:", error);
        errorContainer.textContent = `データ読み込みエラー: ${error.message}`;
        errorContainer.style.display = 'block';

        if (cachedData) {
            console.warn("古いキャッシュを使用して続行します。");
            return JSON.parse(cachedData);
        }
        return null;
    });
}

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
// フレットボード描画 (バレーコード描画ロジック修正済み！)
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

    // 画像の切り替え (lowFret 2以上でハイフレット用の画像に)
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
        
        let displayFret = fret; // 実フレット値で初期化

        if (fret > 0) {
            // ★★★ 修正箇所：lowFret > 1 のときのみ相対計算を行う！ ★★★
            if (lowFret > 1) {
                // lowFretが2以上（バレーコードなど）の場合
                // 相対位置と描画上の+1オフセットを適用
                displayFret = fret - lowFret + 1; 
            } else {
                // lowFretが1（通常の開放弦コード）の場合
                // 実フレット値（fret）をそのまま使う
                displayFret = fret;
            }
        } 
        // fret=0 (開放弦) と fret=-1 (ミュート) の場合はそのまま

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
            // 描画上の1フレット目から6フレット目までのドット
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
    if (!allProgressions[progressionName]) return; 
    
    const chordNames = allProgressions[progressionName];
    if (chordNames.length === 0) return;
    
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