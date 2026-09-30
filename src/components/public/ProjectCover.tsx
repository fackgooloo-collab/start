import { useId } from 'react';
import type { Project } from '../../types';

type Props = { project: Pick<Project, 'cover' | 'title'>; className?: string };

/** Self-contained artwork keeps portfolio previews fast, even without an image service. */
export function ProjectCover({ project, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  if (/^https:\/\//i.test(project.cover)) {
    return <img className={`project-cover ${className}`} src={project.cover} alt={project.title} loading="lazy" referrerPolicy="no-referrer" />;
  }
  const gradient = `${uid}-gradient`;
  const shadow = `${uid}-shadow`;
  return (
    <svg className={`project-cover cover-${project.cover} ${className}`} viewBox="0 0 720 520" role="img" aria-label={`${project.title} 프로젝트 이미지`}>
      <defs>
        <filter id={shadow} x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="18" stdDeviation="14" floodOpacity=".14" /></filter>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={project.cover === 'finance' ? '#343dce' : project.cover === 'beauty' ? '#e6dff4' : project.cover === 'architecture' ? '#ce9071' : '#efd0c0'} />
          <stop offset="100%" stopColor={project.cover === 'finance' ? '#191953' : project.cover === 'beauty' ? '#cbc2da' : project.cover === 'architecture' ? '#af7158' : '#d7ac98'} />
        </linearGradient>
      </defs>
      <rect width="720" height="520" fill={`url(#${gradient})`} />
      {project.cover === 'beauty' ? <Beauty shadow={shadow} /> : project.cover === 'architecture' ? <Architecture shadow={shadow} /> : project.cover === 'finance' ? <Finance shadow={shadow} /> : <Coffee shadow={shadow} />}
    </svg>
  );
}

function Coffee({ shadow }: { shadow: string }) {
  return <>
    <path d="M0 378L720 249V520H0Z" fill="#dcb7a5" />
    <ellipse cx="360" cy="447" rx="235" ry="30" fill="#a17968" opacity=".18" />
    <g transform="translate(119 67) rotate(-7 130 180)" filter={`url(#${shadow})`}>
      <rect width="244" height="361" rx="8" fill="#3b271d" />
      <path d="M0 0H244V23H0M0 338H244V361H0" fill="#493125" />
      <rect x="16" y="37" width="212" height="268" rx="2" fill="#fc764a" />
      <text x="34" y="67" fontSize="12" fill="#3b271d" fontFamily="Arial,sans-serif" letterSpacing="3">GOOD DAYS START HERE</text>
      <text x="28" y="127" fontSize="56" fill="#3b271d" fontFamily="Arial,sans-serif" fontWeight="900" letterSpacing="-4">BOLD</text>
      <text x="28" y="179" fontSize="56" fill="#3b271d" fontFamily="Arial,sans-serif" fontWeight="900" letterSpacing="-4">BREW.</text>
      <circle cx="118" cy="226" r="27" fill="#3b271d" /><path d="M106 226q12-19 24 0q-12 19-24 0" fill="#fc764a" />
      <text x="34" y="284" fontSize="10" fontFamily="Arial,sans-serif" fill="#3b271d" letterSpacing="1">SPECIALTY COFFEE / 200G</text>
      <path d="M28 327H217" stroke="#84624e" strokeWidth="2" />
    </g>
    <g transform="translate(405 198) rotate(11 90 120)" filter={`url(#${shadow})`}>
      <path d="M6 18H174L153 225Q90 244 28 225Z" fill="#f7e8d9" />
      <path d="M18 78H165L155 168H29Z" fill="#fc764a" />
      <rect x="-3" y="4" width="186" height="25" rx="10" fill="#36251d" />
      <rect x="4" y="-4" width="172" height="16" rx="8" fill="#4d372d" />
      <text x="44" y="116" fontSize="30" fill="#35261f" fontFamily="Arial,sans-serif" fontWeight="900" letterSpacing="-2">BOLD</text>
      <text x="40" y="143" fontSize="30" fill="#35261f" fontFamily="Arial,sans-serif" fontWeight="900" letterSpacing="-2">BREW.</text>
    </g>
    <g fill="#3b271d" opacity=".85"><ellipse cx="547" cy="447" rx="10" ry="6" transform="rotate(30 547 447)" /><ellipse cx="574" cy="429" rx="9" ry="6" transform="rotate(-30 574 429)" /><ellipse cx="595" cy="450" rx="10" ry="6" transform="rotate(10 595 450)" /></g>
    <text x="38" y="478" fontSize="11" fill="#664537" fontFamily="Arial,sans-serif" letterSpacing="3">BREW A LITTLE DIFFERENT.</text>
  </>;
}

function Beauty({ shadow }: { shadow: string }) {
  return <>
    <circle cx="569" cy="123" r="124" fill="#f1eaf6" opacity=".35" />
    <path d="M0 397L720 361V520H0Z" fill="#c4bad4" />
    <ellipse cx="364" cy="433" rx="235" ry="32" fill="#8f82a4" opacity=".18" />
    <g transform="translate(133 79) rotate(-10 85 180)" filter={`url(#${shadow})`}>
      <rect width="176" height="352" rx="3" fill="#ece7f1" /><rect x="1" y="2" width="174" height="21" fill="#e4dcec" />
      <text x="20" y="73" fontSize="36" fontFamily="Georgia,serif" fill="#675579" letterSpacing="-1">mellow</text>
      <path d="M20 94H155" stroke="#baadca" />
      <text x="20" y="119" fontSize="9" fontFamily="Arial,sans-serif" fill="#675579" letterSpacing="2">A SOFTER KIND OF CARE</text>
      <path d="M70 243c-43-34-37-89 15-104c-9 39 26 51 31 79c5 30-25 41-46 25Z" fill="#c8b6d9" />
      <text x="20" y="301" fontSize="10" fontFamily="Arial,sans-serif" fill="#675579" letterSpacing="2">DAILY SERUM</text>
      <text x="20" y="324" fontSize="9" fontFamily="Arial,sans-serif" fill="#9b87ae">BOTANICAL ESSENTIALS / 30ML</text>
    </g>
    <g transform="translate(340 123) rotate(9 71 154)" filter={`url(#${shadow})`}>
      <rect x="14" y="67" width="135" height="236" rx="26" fill="#eee8f3" />
      <rect x="41" y="39" width="80" height="44" rx="6" fill="#ab92c1" />
      <path d="M63 40V6h34v34" fill="#c9b2dd" />
      <rect x="61" y="4" width="75" height="15" rx="5" fill="#c9b2dd" />
      <text x="29" y="151" fontSize="29" fontFamily="Georgia,serif" fill="#675579" letterSpacing="-1">mellow</text>
      <path d="M34 164H130" stroke="#baa6cd" />
      <text x="35" y="186" fontSize="8" fontFamily="Arial,sans-serif" fill="#675579" letterSpacing="1">MAKE ROOM FOR YOU.</text>
      <text x="35" y="260" fontSize="9" fontFamily="Arial,sans-serif" fill="#9b87ae">DAILY SERUM / 30ML</text>
    </g>
    <circle cx="563" cy="381" r="59" fill="#d6c4e5" filter={`url(#${shadow})`} />
    <circle cx="548" cy="367" r="28" fill="#e3d6ee" opacity=".6" />
    <text x="40" y="478" fontSize="11" fontFamily="Arial,sans-serif" fill="#746285" letterSpacing="3">YOUR EVERYDAY, SOFTENED.</text>
  </>;
}

function Architecture({ shadow }: { shadow: string }) {
  return <>
    <text x="38" y="60" fontSize="18" fontFamily="Arial,sans-serif" fill="#f7e6db" letterSpacing="6">FORME</text>
    <text x="522" y="60" fontSize="9" fontFamily="Arial,sans-serif" fill="#f7e6db" letterSpacing="2">SPACES FOR LIVING</text>
    <g transform="translate(91 103) rotate(-5 252 151)" filter={`url(#${shadow})`}>
      <rect width="541" height="327" rx="7" fill="#faf9f5" />
      <rect x="0" y="0" width="541" height="28" rx="7" fill="#f0efeb" />
      <circle cx="13" cy="14" r="3" fill="#c4c2bb" /><circle cx="24" cy="14" r="3" fill="#c4c2bb" /><circle cx="35" cy="14" r="3" fill="#c4c2bb" />
      <text x="25" y="61" fontSize="17" fontFamily="Arial,sans-serif" fill="#30322b" letterSpacing="4">FORME</text>
      <text x="370" y="57" fontSize="6" fontFamily="Arial,sans-serif" fill="#77796d" letterSpacing="1">PROJECTS    STUDIO    CONTACT</text>
      <text x="25" y="110" fontSize="32" fontFamily="Georgia,serif" fill="#30322b">Space, shaped</text>
      <text x="25" y="146" fontSize="32" fontFamily="Georgia,serif" fill="#30322b">by life.</text>
      <text x="27" y="177" fontSize="7" fontFamily="Arial,sans-serif" fill="#898b7e" letterSpacing=".5">THOUGHTFUL SPACES. TIMELESS DESIGN.</text>
      <rect x="26" y="198" width="94" height="23" rx="12" fill="#30322b" />
      <text x="41" y="212" fontSize="6" fontFamily="Arial,sans-serif" fill="#fff">EXPLORE OUR WORK →</text>
      <rect x="268" y="82" width="248" height="218" fill="#d6cec1" />
      <path d="M268 239H516V300H268Z" fill="#e6dfd1" />
      <path d="M332 125L440 94L494 115V258H332Z" fill="#f2eee4" />
      <path d="M440 94L494 115V258L440 235Z" fill="#ded8cc" />
      <path d="M346 156L424 134V234L346 255Z" fill="#343b33" />
      <path d="M357 161L412 145V226L357 241Z" fill="#a6ac98" />
      <path d="M384 154V234M357 200L412 184" stroke="#d5d4c6" strokeWidth="3" />
      <path d="M451 140L481 151V222L451 211Z" fill="#828875" />
      <path d="M285 282L485 227L510 242L310 300Z" fill="#c4bbab" opacity=".55" />
      <path d="M274 260H332V275H274Z" fill="#bab6a1" /><path d="M284 262v-49" stroke="#727b57" strokeWidth="4" /><ellipse cx="285" cy="204" rx="16" ry="26" fill="#89906c" />
      <text x="25" y="297" fontSize="7" fontFamily="Arial,sans-serif" fill="#77796d" letterSpacing="2">SEOUL · DESIGN STUDIO</text>
    </g>
    <text x="40" y="478" fontSize="11" fontFamily="Arial,sans-serif" fill="#f7e6db" letterSpacing="3">A NEW PERSPECTIVE ON SPACE.</text>
  </>;
}

function Finance({ shadow }: { shadow: string }) {
  return <>
    <circle cx="111" cy="419" r="230" fill="#484bd5" opacity=".45" />
    <circle cx="644" cy="50" r="180" fill="#7473ed" opacity=".12" />
    <text x="39" y="61" fontSize="26" fontFamily="Arial,sans-serif" fill="#e7edff" fontWeight="700" letterSpacing="-1">orbit ↗</text>
    <g transform="translate(88 120) rotate(-6 208 155)" filter={`url(#${shadow})`}>
      <rect width="445" height="292" rx="14" fill="#f5f6fc" />
      <path d="M0 14Q0 0 14 0H431Q445 0 445 14V35H0Z" fill="#e8eaf6" />
      <circle cx="16" cy="17" r="3" fill="#bbbfd8" /><circle cx="27" cy="17" r="3" fill="#bbbfd8" /><circle cx="38" cy="17" r="3" fill="#bbbfd8" />
      <text x="22" y="71" fontSize="17" fontFamily="Arial,sans-serif" fill="#303477" fontWeight="700">orbit ↗</text>
      <text x="23" y="107" fontSize="10" fontFamily="Arial,sans-serif" fill="#9297b5">YOUR MONEY, IN MOTION</text>
      <text x="23" y="143" fontSize="28" fontFamily="Arial,sans-serif" fill="#303477" fontWeight="700">₩12,480,000</text>
      <rect x="23" y="157" width="88" height="18" rx="9" fill="#e1f5d6" /><text x="34" y="169" fontSize="8" fontFamily="Arial,sans-serif" fill="#548249">↗ 18.4% THIS MONTH</text>
      <path d="M25 240H413M25 214H413M25 188H413" stroke="#e3e5ef" />
      <path d="M25 251L66 237L104 240L144 211L188 220L229 187L273 196L316 171L356 180L409 155V264H25Z" fill="#dedffc" />
      <path d="M25 251L66 237L104 240L144 211L188 220L229 187L273 196L316 171L356 180L409 155" fill="none" stroke="#6861d9" strokeWidth="4" strokeLinecap="round" />
    </g>
    <g transform="translate(482 182) rotate(9 58 132)" filter={`url(#${shadow})`}>
      <rect width="139" height="266" rx="22" fill="#242444" /><rect x="6" y="6" width="127" height="254" rx="17" fill="#f7f8fd" />
      <rect x="47" y="11" width="45" height="8" rx="4" fill="#242444" />
      <text x="19" y="52" fontSize="13" fontFamily="Arial,sans-serif" fill="#3b3d76" fontWeight="700">orbit ↗</text>
      <text x="19" y="83" fontSize="7" fontFamily="Arial,sans-serif" fill="#9197b8">GOOD THINGS ADD UP.</text>
      <text x="19" y="109" fontSize="18" fontFamily="Arial,sans-serif" fill="#3b3d76" fontWeight="700">₩12,480k</text>
      <circle cx="70" cy="168" r="35" fill="none" stroke="#e3e3f2" strokeWidth="12" />
      <circle cx="70" cy="168" r="35" fill="none" stroke="#7166dc" strokeWidth="12" strokeDasharray="150 220" transform="rotate(-90 70 168)" />
      <text x="56" y="172" fontSize="12" fontFamily="Arial,sans-serif" fill="#3b3d76" fontWeight="700">68%</text>
      <rect x="18" y="224" width="103" height="22" rx="11" fill="#7166dc" /><text x="39" y="238" fontSize="7" fontFamily="Arial,sans-serif" fill="#fff">LET'S GROW →</text>
    </g>
    <text x="40" y="478" fontSize="11" fontFamily="Arial,sans-serif" fill="#ced1fd" letterSpacing="3">MAKE YOUR NEXT MOVE.</text>
  </>;
}
