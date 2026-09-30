export function HeroArtwork({ englishName }: { englishName: string }) {
  return <div className="hero-artwork" aria-hidden="true">
    <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
    <div className="art-caption">A LITTLE SPARK.<br />A BIG DIFFERENCE.</div>
    <div className="art-paper">
      <div className="art-paper-top"><span>{englishName}</span><span>✳</span></div>
      <div className="art-paper-heading">IDEAS<br />THAT<br /><span>CLICK.</span></div>
      <svg className="art-paper-flower" viewBox="0 0 120 120"><path d="M60 9C78-10 83 21 89 28C114 18 109 49 102 55C125 71 96 85 85 84C84 111 63 104 57 96C40 116 27 92 28 79C1 78 13 51 23 47C6 25 34 21 44 29C40 3 57 4 60 9Z" fill="#171918" /><circle cx="61" cy="59" r="13" fill="#e8ff59" /></svg>
      <div className="art-paper-bottom">GOOD DESIGN.<br />GREAT CONNECTIONS. <span>↗</span></div>
    </div>
    <div className="art-browser">
      <div className="art-browser-bar"><span /><span /><span /><i>zzirit.studio</i></div>
      <div className="art-browser-content"><div className="art-browser-logo">ZZ.</div><span className="art-browser-menu">WORK &nbsp; ABOUT &nbsp; CONTACT</span><p>Make it<br /><em>electric.</em></p><div className="art-browser-wave"><svg viewBox="0 0 240 200"><path d="M115 4C139 19 188-18 200 26C205 46 173 53 195 74C231 106 250 134 206 142C174 148 195 184 166 195C137 206 129 172 105 190C72 215 58 164 41 157C10 145-8 128 12 102C25 85 44 90 46 66C50 21 91-12 115 4Z" fill="#e8ff59" /><path d="M135 27L70 104H112L90 174L170 89H125Z" fill="#171918" /></svg></div><span className="art-browser-bottom">DESIGNED TO MAKE YOU FEEL SOMETHING. ↗</span></div>
    </div>
    <div className="art-sticker"><svg viewBox="0 0 80 80"><path d="M40 0L47 25L66 12L57 33L80 40L55 47L68 66L47 57L40 80L33 55L14 68L23 47L0 40L25 33L12 14L33 23Z" fill="currentColor" /></svg><span>한 끗의<br />차이!</span></div>
    <div className="art-tiny-note"><svg viewBox="0 0 24 24"><path d="M4 3v10h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg> 시작은 작아도,<br />&nbsp;&nbsp; 인상은 오래 남도록.</div>
  </div>;
}
