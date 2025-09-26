// script.js の全文 (多段表示モードの追加)

const progressionSelect = document.getElementById('progression-select');
const startProgressionButton = document.getElementById('start-progression-button');
const nextChordButton = document.getElementById('next-chord-button');
const prevChordButton = document.getElementById('prev-chord-button');
const randomProgressionButton = document.getElementById('random-progression-button');
const toggleAutoUpdateButton = document.getElementById('toggle-auto-update');
const errorContainer = document.getElementById('error-container');

// ★★★ 追加要素 ★★★
const detailedModeDisplay = document.getElementById('detailed-mode-display');
const listModeDisplay = document.getElementById('list-mode-display');
const toggleDisplayModeButton = document.getElementById('toggle-display-mode');
// ★★★ モード管理変数 ★★★
let currentDisplayMode = 'detailed'; // 'detailed' (2個表示) または 'list' (多段表示)

let allProgressions = {}; 
let allChords = {};       
let currentProgression = null;
let currentChordIndex = 0;
let autoUpdateInterval = null;
let isAutoUpdating = false;

// =========================================================================
// GAS接続設定 (変更なし)
// =========================================================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx1I7sOC37M1RR6aAAqfJoQCVi7KTGtQk4Z13s6cGplpF28kf88H4vKNVvDIzudeqbA/exec'; 
const CACHE_KEY = 'chordAppCache';
const CACHE_TTL = 3600000; // キャッシュ有効期間: 1時間 (ミリ秒)

// =========================================================================
// フレットボードの描画パラメータ (変更なし)
// =========================================================================
const FRET_POSITIONS = [22, 43, 65, 86, 88, 95]; 
const Y_AXIS_STRING_POSITIONS = [71.5, 63.5, 56.5, 48, 41, 33.5]; 
const OPEN_MUTE_X_POSITION = '4%'; 

// =========================================================================
// GAS接続とデータ整形ロジック (変更なし)
// =========================================================================
// fetchDataFromGAS(), loadProgressions(), populateProgressionSelect() は変更なしでそのまま利用
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
            const script = document.getElementById('gasScriptTag');
            if(script) script.remove(); 
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
        script.id = 'gasScriptTag'; 
        script.onerror = () => {
             delete window[callbackName];
             const script = document.getElementById('gasScriptTag');
             if(script) script.remove();
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
// フレットボード描画 (既存の機能をそのまま使用)
// =========================================================================

// drawFretboard(containerId, chordName) は、元のコード通りで変更なし。
// リストモードにもこの関数を流用できるように、containerIdからCSSクラスを判断して調整する。
function drawFretboard(containerId, chordName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // リストモードかどうかを判定するフラグ
    const isListModeElement = container.classList.contains('list-fretboard-size'); 
    
    container.innerHTML = '';
    
    const chordData = allChords[chordName];
    if (!chordData) {
        container.textContent = 'コードデータなし';
        // リストモードの場合は、要素自体を空にせず、コンテナごと削除しないとダメなので注意
        if (!isListModeElement) {
            container.textContent = 'コードデータなし';
        }
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
        // リストモードの場合は位置を調整
        if (isListModeElement) {
            fretLabel.style.left = '5%';
            fretLabel.style.bottom = '5%';
        } else {
            fretLabel.style.left = '18%'; 
            fretLabel.style.bottom = '12%'; 
        }
        container.appendChild(fretLabel);
    }
    
    fretPositions.forEach((fret, stringIndex) => {
        const dot = document.createElement('div');
        dot.style.top = `${Y_AXIS_STRING_POSITIONS[stringIndex]}%`;
        
        let displayFret = fret; 

        if (fret > 0) {
            if (lowFret > 1) {
                displayFret = fret - lowFret + 1; 
            } else {
                displayFret = fret;
            }
        } 

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


// ★★★ 新規追加: リストモード用の描画関数 ★★★
function renderListMode(progression, currentIndex) {
    listModeDisplay.innerHTML = ''; // クリア

    progression.forEach((chordName, index) => {
        const isCurrent = (index === currentIndex);
        const containerId = `list-chord-fretboard-${index}`;
        
        // コード図全体を包むラッパー
        const wrapper = document.createElement('div');
        wrapper.className = `list-chord-container ${isCurrent ? 'current-chord-list' : ''}`;
        
        // コード名表示
        const nameElement = document.createElement('h2');
        nameElement.textContent = allChords[chordName]?.displayName || chordName;
        wrapper.appendChild(nameElement);

        // フレットボードコンテナ
        const fretboardContainer = document.createElement('div');
        fretboardContainer.id = containerId;
        fretboardContainer.className = 'list-fretboard-size'; // リストモード用のCSSクラスを付与
        wrapper.appendChild(fretboardContainer);
        
        listModeDisplay.appendChild(wrapper);
        
        // 描画関数を呼び出し（既存のdrawFretboardを再利用）
        drawFretboard(containerId, chordName);
    });
}


// =========================================================================
// ロジック/イベントハンドラ (モード切り替え対応)
// =========================================================================

function updateChordDisplay(progression, index) {
    const currentChordIndex = index;
    const progressionLength = progression.length;

    // プログレスバーの更新
    const progressBar = document.getElementById('progress-bar');
    const progressWidth = ((currentChordIndex + 1) / progressionLength) * 100;
    progressBar.style.width = `${progressWidth}%`;
    progressBar.textContent = `${currentChordIndex + 1}/${progressionLength}`;


    if (currentDisplayMode === 'detailed') {
        // 詳細モード (既存の2個表示)
        detailedModeDisplay.style.display = 'flex';
        listModeDisplay.style.display = 'none';
        toggleDisplayModeButton.textContent = '▶ 全て表示に切り替え';

        const currentChordName = progression[currentChordIndex];
        const nextChordName = progression[(currentChordIndex + 1) % progressionLength];

        const currentNameElement = document.getElementById('current-chord-displayname');
        const nextNameElement = document.getElementById('next-chord-displayname');

        currentNameElement.textContent = allChords[currentChordName]?.displayName || currentChordName; 
        nextNameElement.textContent = allChords[nextChordName]?.displayName || nextChordName; 

        drawFretboard('fretboard-container', currentChordName);
        drawFretboard('next-fretboard-container', nextChordName);
        
        // ナビゲーションボタンを表示
        nextChordButton.style.display = 'block';
        prevChordButton.style.display = 'block';
        
    } else {
        // リストモード (全コード多段表示)
        detailedModeDisplay.style.display = 'none';
        listModeDisplay.style.display = 'flex';
        toggleDisplayModeButton.textContent = '▶ 2コード表示に切り替え';
        
        renderListMode(progression, currentChordIndex);
        
        // ナビゲーションボタンを非表示
        nextChordButton.style.display = 'none';
        prevChordButton.style.display = 'none';
    }
}


function startProgression(progressionName) {
    if (!allProgressions[progressionName]) return; 
    
    const chordNames = allProgressions[progressionName];
    if (chordNames.length === 0) return;
    
    currentProgression = chordNames;
    currentChordIndex = 0;
    // 開始時は必ず詳細モードにリセットする
    currentDisplayMode = 'detailed'; 
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


// ★★★ 新規追加: モード切り替え関数 ★★★
function toggleDisplayMode() {
    if (!currentProgression) return;
    
    if (currentDisplayMode === 'detailed') {
        currentDisplayMode = 'list';
    } else {
        currentDisplayMode = 'detailed';
    }
    
    // オートアップデートを一時停止する
    if (isAutoUpdating) { 
        toggleAutoUpdate();
    }
    
    updateChordDisplay(currentProgression, currentChordIndex);
}
toggleDisplayModeButton.addEventListener('click', toggleDisplayMode);


// ... (toggleAutoUpdate, generateRandomProgression, イベントリスナーは省略。変更なし) ...
function toggleAutoUpdate() {
    if (!currentProgression) {
        alert("コード進行を選択して開始してください。");
        return;
    }
    // リストモードでは自動更新を許可しない
    if (currentDisplayMode === 'list') {
        alert("全コード表示モードでは自動更新はできません。2コード表示に切り替えてください。");
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