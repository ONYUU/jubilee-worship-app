# Jubilee Worship 모바일 디자인 시안

## 목적

실제 앱 개발 전에 `홈 · 예배 · 미디어 · 안내` 4개 화면, 시작 화면과 송리스트 상세 화면의 시각 방향을 검토하기 위한 고충실도 정적 목업이다. 실제 기능을 구현한 앱은 아니다.

## 디자인 방향

- `Night Gathering · v1`: 기존 어두운 시안
- `Open Sky · v2`: 밝은 앱 배경 `#F7FAFC`, 흰 카드 `#FFFFFF`, 본문 `#162331`
- `Morning Haze · v3`: 사진과 연결되는 회청색 배경 `#E7EEF1`, 회아이보리 카드 `#F3F5F3`, 본문 `#1D2A34`
- `Rose Haze · v4`: 로즈베이지·회핑크 배경 `#E5D8D9`, 로즈아이보리 카드 `#F0E8E5`, 본문 `#30272B`
- `Rose Haze · Logo-free v5`: v4 색감은 유지하고 앱 내부의 그래픽 로고를 전부 제거한 이전 확정 방향
- `Rose Haze · Logo-free v6`: v5를 유지하면서 홈과 예배 카드 안에 설교 주제와 말씀 구절 영역을 추가한 이전 안
- `Instagram-inspired v7`: 전면 사진과 평면형 정보 계층을 적용한 구조 개편안
- `Logo palette v8`: v7 구조에 공식 하늘색과 연노랑을 소량의 기능색으로 적용한 안
- `Light · Dark v9`: 사진 중심·평면형 구조를 유지하고 라이트와 다크 두 모드만 제공하는 현재 확정안
- 목업 배열은 `예배 메인 → 송리스트 상세` 순서이며, 송리스트는 예배 화면의 링크로 들어가는 상세 화면이다. 별도 탭이나 예배 화면 아래의 연속 스크롤 영역이 아니다.
- 공식 하늘색 `#62A2E4`는 넓은 면과 장식에 사용하고, 작은 글자·활성 탭은 대비가 더 높은 `#2D6F9F`를 사용한다.
- 공식 연노랑 `#FFF5AE`는 주요 버튼 면에만 사용하고, 글자는 `#162331`, 테두리는 `#A88923`을 사용한다.
- 사진 위 글자는 사진별 가독성을 위해 제한적으로 어두운 그라데이션을 유지한다.
- 원칙: 공식 사진은 변형하지 않고 사용하며, v5 앱 화면에는 그래픽 로고를 배치하지 않는다. 앱 이름은 일반 서체의 텍스트로만 표기한다.
- v5에서는 홈 단체사진을 무로고 영역으로 재크롭하고, 로고·대형 브랜드 문구가 포함된 영상·안내 이미지는 로고 없는 공식 예배사진으로 교체했다.
- v6에서는 설교를 별도 탭으로 만들지 않고 다음 예배 카드와 예배 카드 안에 `이번 예배 말씀`으로 표시한다. 정보 순서는 `예배 일정 → 설교 주제·말씀 구절 → 송리스트`다.
- 목업의 `설교 주제가 표시됩니다`, `말씀 구절이 표시됩니다`는 배치 확인용 예시이며 실제 쥬빌리워십 설교 정보가 아니다.
- 1차 앱은 성경 번역문 전문이 아니라 관리자가 확인한 성경책·장·절 표기만 제공한다.
- 생성형 이미지: 사람, 예배 장면, 로고, 문자 없이 보조 배경으로만 사용한다.
- v9 보드는 배치·색상 참고용이다. 보드 안의 AI 합성 인물·문자·아이콘을 잘라 실제 앱 자산으로 사용하지 않는다.
- 실제 앱 사진은 이용 승인된 공식 원본만 사용하고, 생성형 이미지는 라이트·다크 시작 배경과 공통 추상 아이콘에만 제한한다.

## 결과물

- 어두운 전체 보드: `output/app-design-board-v1.png`
- 밝은 전체 보드: `output/app-design-board-v2-light.png`
- 중간톤 전체 보드: `output/app-design-board-v3-balanced.png`
- 로즈 전체 보드: `output/app-design-board-v4-rose.png`
- 로고 없는 로즈 전체 보드: `output/app-design-board-v5-rose-logo-free.png`
- 설교 정보 포함 v6 전체 보드: `output/app-design-board-v6-rose-logo-free-sermon.png`
- 사진 중심 구조 보드: `output/app-design-board-v7-instagram-inspired.png`
- 공식 팔레트 보드: `output/app-design-board-v8-instagram-logo-palette.png`
- 현재 확정 라이트·다크 보드: `output/app-design-board-v9-light.png`, `output/app-design-board-v9-dark.png`
- 어두운 개별 화면: `output/splash-v1.png`, `home-v1.png`, `worship-v1.png`, `media-v1.png`, `guide-v1.png`, `songlist-v1.png`
- 밝은 개별 화면: `output/splash-v2-light.png`, `home-v2-light.png`, `worship-v2-light.png`, `media-v2-light.png`, `guide-v2-light.png`, `songlist-v2-light.png`
- 중간톤 개별 화면: `output/splash-v3-balanced.png`, `home-v3-balanced.png`, `worship-v3-balanced.png`, `media-v3-balanced.png`, `guide-v3-balanced.png`, `songlist-v3-balanced.png`
- 로즈 개별 화면: `output/splash-v4-rose.png`, `home-v4-rose.png`, `worship-v4-rose.png`, `media-v4-rose.png`, `guide-v4-rose.png`, `songlist-v4-rose.png`
- 로고 없는 로즈 개별 화면: `output/splash-v5-rose-logo-free.png`, `home-v5-rose-logo-free.png`, `worship-v5-rose-logo-free.png`, `media-v5-rose-logo-free.png`, `guide-v5-rose-logo-free.png`, `songlist-v5-rose-logo-free.png`
- 설교 정보 포함 v6 개별 화면: `output/splash-v6-rose-logo-free-sermon.png`, `home-v6-rose-logo-free-sermon.png`, `worship-v6-rose-logo-free-sermon.png`, `media-v6-rose-logo-free-sermon.png`, `guide-v6-rose-logo-free-sermon.png`, `songlist-v6-rose-logo-free-sermon.png`
- 편집 가능한 목업: `app-concept-v1.html`
- 렌더 스크립트: `render-mockups.mjs`
- 송리스트 기능 명세: `SONGLIST_SPEC.md`
- 설교·말씀 기능 명세: `SERMON_SPEC.md`
- GPT 생성 배경: `assets/app-worship-light-v1.png`, `assets/app-worship-light-v2.png`, `assets/app-worship-balanced-v3.png`, `assets/app-worship-rose-v4.png`
- 실제 앱용 GPT 자산: `apps/mobile/assets/images/jubilee/app-icon-sky.png`, `splash-light-title.png`, `splash-dark-title.png`

## GPT 이미지 생성 프롬프트

Built-in GPT 이미지 기능을 사용했다. `v1`은 아래 프롬프트로 생성했다.

> A restrained abstract worship-light composition for a premium mobile app splash and hero background. Deep midnight navy to near-black portrait field, one flowing pale-gold light ribbon rising from the lower third toward the upper right, subtle muted sky-blue secondary glow, realistic volumetric light, fine natural grain, quiet central negative space for UI. No people, faces, church interior, stage, instruments, cross symbol, logos, letters, typography, watermark, planets, stars, neon cyberpunk or invented religious iconography.

`Open Sky · v2`는 다음 프롬프트로 생성했다.

> Use case: stylized-concept. Asset type: bright premium mobile app splash and subtle hero background for the Jubilee Worship app. Primary request: a luminous, calm abstract composition that feels open, welcoming, youthful, and suitable behind exact native mobile UI. Scene/backdrop: warm ivory and airy near-white vertical field with translucent soft-sky-blue light drifting upward, joined by one restrained pale-gold ribbon that curves gently from the lower edge toward the upper right. Style/medium: refined editorial abstract photography, natural light diffusion, soft atmospheric depth, subtle fine paper-like grain, premium but understated, not fantasy concept art. Composition/framing: portrait 2:3; generous quiet negative space in the upper center and middle for the official app icon and dark Korean UI text; visual movement concentrated near the bottom and far right; no bright hotspot directly behind text. Lighting/mood: fresh morning light, peaceful, reverent, optimistic, clear and spacious. Color palette: warm ivory #F7FAFC, soft white #FFFFFF, mist blue #E7F2FC, official sky blue #62A2E4 used softly, pale worship gold #FFF5AE, tiny muted slate-blue shadows for depth. Materials/textures: translucent light veil, very subtle haze, fine organic grain, soft edges. Constraints: no people, no faces, no church interior, no stage, no instruments, no cross symbol, no logos, no letters, no words, no typography, no watermark; do not imitate or invent the Jubilee Worship logo; maintain strong quiet space for dark UI text; usable as a light-mode mobile background. Avoid: dark background, black field, heavy shadows, generic galaxy, outer space, planets, stars, neon, cyberpunk, lens flare clutter, fire, smoke plumes, pastel rainbow, childish illustration, medical-clinic sterility, AI artifacts, decorative religious iconography.

`Morning Haze · v3`는 v2의 구도는 유지하면서 과도한 흰색을 줄이는 편집 모드로 생성했다.

> Use case: lighting-weather. Asset type: refined mobile app splash background, middle-brightness revision for Jubilee Worship. Input image: edit target — the existing Open Sky v2 abstract background. Preserve its portrait composition, generous quiet center, flowing gold-and-blue ribbons, fine texture, and absence of text or symbols. Primary request: reduce the excessive white brightness and transform only the overall lighting and color atmosphere into a balanced luminous mid-tone that harmonizes with dark, warm worship photography while still feeling clearly brighter than a night theme. Scene/backdrop: replace the near-white field with layered warm blue-gray, muted slate, soft stone, and restrained ivory illumination; create a subtle vignette and cinematic depth, with the center slightly lighter for the official logo and dark navy Korean text. Style/medium: refined editorial abstract photography, natural atmospheric diffusion, premium and calm, not glossy or clinical. Composition/framing: portrait 2:3; keep quiet negative space around the upper-center and middle; retain visual movement near the lower edge and far right. Lighting/mood: soft overcast morning after rain, welcoming, reverent, youthful, calm; medium-light overall exposure, neither dark nor washed out. Color palette: warm slate blue #768896, mist blue-gray #AEBBC3, stone #D8D6CE, muted ivory #ECE7DA, official sky blue #62A2E4 used sparingly, muted worship gold #D7BD62; no large pure-white area. Materials/textures: translucent light veil, fine organic grain, soft atmospheric layers. Constraints: change only lighting, tone, and color atmosphere; preserve the abstract ribbon composition and open center; no people, faces, church interior, stage, instruments, cross, logos, letters, words, typography, watermark; do not invent or imitate the Jubilee Worship logo; must remain usable behind exact native UI. Avoid: pure white dominant background, black background, heavy darkness, harsh contrast, sterile hospital blue, pastel rainbow, childish illustration, neon, galaxy, fire, smoke plume, lens-flare clutter, AI artifacts.

`Rose Haze · v4`는 v3의 구도와 중간 밝기를 유지하면서 로즈베이지·회핑크로 편집했다.

> Use case: lighting-weather. Asset type: premium mobile app splash background, Rose Haze v4 revision for Jubilee Worship. Input image: edit target — the existing Morning Haze v3 abstract background. Preserve the exact portrait composition, open center, fine atmospheric texture, flowing translucent ribbon shapes, and absence of text or symbols. Primary request: change only the overall color atmosphere from blue-gray morning haze to a restrained rose-beige and gray-pink haze that feels warm, mature, reverent, and compatible with dark worship photography; keep the exposure medium-light rather than pale white. Scene/backdrop: layered dusty rose-gray, warm mushroom beige, muted mauve stone, and restrained pearl-ivory light; retain one soft muted-gold ribbon and a very small cool slate-blue undertone so the official blue-and-yellow logo can sit naturally on top. Style/medium: refined editorial abstract photography, natural atmospheric diffusion, premium and calm, neither romantic floral nor beauty advertising. Composition/framing: portrait 2:3; keep generous quiet negative space in the center for the official app icon and dark navy Korean UI text; visual movement remains near the lower edge and far right. Lighting/mood: gentle late-morning light through rose-tinted haze, welcoming, youthful but mature, peaceful and spacious; subtle vignette, no washed-out whites. Color palette: gray pink #CDBFC2, rose beige #D8CAC3, warm mushroom #B9AAA7, muted ivory #E8E0D7, dusty mauve #9B8087, restrained gold #D5BB69, tiny cool slate #7F919E. Materials/textures: translucent light veil, fine organic grain, soft atmospheric layers. Constraints: change only lighting and palette; preserve composition and open center; no people, faces, flowers, church interior, stage, instruments, cross, logos, letters, words, typography, watermark; do not invent or imitate the Jubilee Worship logo; usable behind exact native UI. Avoid: bright bubblegum pink, hot pink, magenta, lavender-purple dominance, bridal romance, cosmetics-ad styling, childish pastel, pure-white dominant field, black background, neon, galaxy, fire, smoke plume, lens-flare clutter, AI artifacts.

## 사용 금지

- 기존 홈페이지에서 제외 요청된 `sundoo-jubilee-05`
- GPT 로고 복원 실패본과 구형 확대 로고
- AI로 만든 인물이나 가상의 예배 현장
- 공식 승인 전 최근 Instagram 원본

## 재렌더

```sh
node design/mobile/render-mockups.mjs
```
