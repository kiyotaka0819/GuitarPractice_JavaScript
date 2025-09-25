<style>
/* index.html の <style> ブロック内 */
body {
    font-family: Arial, sans-serif;
    text-align: center;
    padding: 20px;
}

/* フレットボードのコンテナのアスペクト比を固定 */
#fretboard-container, #next-fretboard-container {
    /* 必須: 子要素の絶対位置の基準にする */
    position: relative; 
    /* 220px (高さ) / 240px (幅) * 100% ≈ 91.66% でアスペクト比を固定 */
    padding-top: 91.66%; 
    width: 100%;
    height: 0;
    margin: 0 auto 20px;
    overflow: hidden;
    /* JSで設定される背景画像をここでも定義しておく */
    background-size: contain; 
    background-repeat: no-repeat;
    background-position: center top; 
}

/* 親要素の幅を制限して、デカくなりすぎないようにする（必要に応じて） */
.fretboard-display {
    width: 240px; /* PCでの最大幅 */
    margin: 0 auto;
}

/* コード名表示 */
.chord-display {
    font-size: 48px;
    font-weight: bold;
    margin: 10px 0;
}
#next-chord-displayname {
    font-size: 24px;
    color: #555;
}

/* 押弦ドット */
.dot {
    position: absolute;
    /* ★★★ 修正: サイズを相対値 6% に更新 ★★★ */
    width: 6%;
    height: 6%;
    background-color: #FF4500;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    border: 2px solid black;
    z-index: 2;
}

/* 開放弦マーク (●) */
.open-mark {
    position: absolute;
    width: 6%;
    height: 6%;
    background-color: #FFD700;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    border: 2px solid black;
    z-index: 2;
    text-align: center;
    font-size: 0; 
}

/* ミュートマーク (×) */
.mute-mark {
    position: absolute;
    width: 6%;
    height: 6%;
    background-color: transparent;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    z-index: 2;
    color: black;
    font-size: 10px; 
    line-height: 1.5; 
    text-align: center;
}

/* ローフレット番号表示 */
.fret-label {
    position: absolute;
    font-size: 18px;
    font-weight: bold;
    color: black;
    padding: 2px 4px; 
    z-index: 3;
    /* JSで top/left が設定されるので、CSSでの transform は不要だが保険で残す */
    transform: translate(-50%, -50%);
}

/* プログレスバー */
#progress-bar-container {
    width: 80%;
    max-width: 400px;
    margin: 20px auto 10px;
    background-color: #ddd;
    border-radius: 5px;
    height: 25px;
    overflow: hidden;
}
#progress-bar {
    height: 100%;
    width: 0%;
    background-color: #4CAF50;
    text-align: right;
    padding-right: 10px;
    color: white;
    line-height: 25px;
    font-weight: bold;
}
</style>