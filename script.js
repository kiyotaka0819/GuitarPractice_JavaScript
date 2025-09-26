// =========================================================================
// フレットボードの描画パラメータ (最終調整済み！)
// =========================================================================
// FRET_POSITIONS: [1F, 2F, 3F, 4F, 5F, 6F] 
// 4フレット目を 86 に、他は以前の調整値を維持
const FRET_POSITIONS = [22, 43, 65, 86, 88, 95]; 

// Y_AXIS_STRING_POSITIONS: [6弦, 5弦, 4弦, 3弦, 2弦, 1弦]
// 全ての値を -2.0 調整済み
const Y_AXIS_STRING_POSITIONS = [69.5, 61.5, 54.5, 47, 39, 32.5]; 

// OPEN_MUTE_X_POSITION: 開放弦/ミュートのX軸位置 (4%に確定)
const OPEN_MUTE_X_POSITION = '4%'; 

// drawFretboard 関数内の lowFret ラベルの位置も、以前の調整値を反映
// '10%' -> '18%', '4%' -> '12%'
/*
if (lowFret >= 2) {
    const fretLabel = document.createElement('div');
    fretLabel.className = 'fret-label';
    fretLabel.textContent = lowFret;
    fretLabel.style.left = '18%'; // 修正
    fretLabel.style.bottom = '12%'; // 修正
    container.appendChild(fretLabel);
}
*/