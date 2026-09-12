# 사양 아이콘 생성 기록

2026-09-12 · Codex 내장 `image_gen` 사용. 16개 분류 × 모노/컬러/픽셀 3개 시리즈 = 48개 아이콘입니다. 각 시리즈는 투명 PNG 아틀라스 한 장으로 생성했으며 원본 PNG와 알파 채널을 그대로 보관합니다. 앱은 투명한 셀 경계를 읽어 아이콘별 원본 사각형을 계산합니다.

분류 순서: CPU, 메인보드, RAM, GPU / SSD, HDD, PSU, 케이스 / 쿨러, 모니터, 스피커, 마우스 / 키보드, 헤드셋, 마이크, 기타.

프로젝트 자산: `renderer/assets/spec-icons/mono.png`, `color.png`, `pixel.png`. 앱 실행 중 외부 생성 API나 네트워크가 필요하지 않습니다.

## Mono

```text
Use case: stylized-concept.
Asset type: ONE production sprite atlas for a PC specifications card editor, series MONO. Generate a square 2048x2048 PNG with genuinely transparent alpha background.
Primary request: a perfectly regular 4-column by 4-row sprite sheet containing exactly 16 separate, recognizable computer hardware pictograms. Each cell occupies exactly one quarter of the canvas width and height. Keep every object wholly inside its own cell with 10% empty padding on every edge. Center each icon precisely in its cell. No grid lines, no cell backgrounds, no labels, no letters, no numbers, no text anywhere, no logos, no watermark, no shadows outside the objects. Do not put a checkerboard into the image; background must be actual alpha transparency.
Style: ONE cohesive mono icon family: thick charcoal-black contour, opaque ivory-white interior forms, very simplified technical drawing, front or top views with only subtle depth, flat ink pictograms. All 16 have the same heavy stroke, the same level of simplification, and balanced apparent size. These must remain recognizable when displayed at 24 to 40 pixels tall. Minimize tiny internal detail. Use the silhouette and 2-4 structural details to identify each device.
Required cell order, strictly left to right:
Row 1: CPU square chip with pins on four edges; motherboard square circuit board with CPU socket and 2 slots; RAM long memory stick with 4 rectangular chips and bottom contacts; graphics card horizontal dual-fan GPU with mounting bracket.
Row 2: solid state drive 2.5-inch rectangular closed enclosure with small SATA connector, no exposed platter; hard disk drive with visible round platter and read arm; power supply unit cube with round fan grille plus AC socket; desktop PC tower case with front intake panels and power button.
Row 3: CPU air cooler with a fan in front of a stack of metal fins; widescreen monitor on a stand; a matched pair of stereo speaker boxes shown as one paired icon; computer mouse with scroll wheel.
Row 4: keyboard with compact block keys; over-ear headset with headband and small microphone boom; desktop microphone on a short stand; a simple jigsaw puzzle piece representing a generic/custom component.
Keep all 16 objects separate. This exact 4x4 atlas will be read directly by application code.
```

## Color

```text
Use case: stylized-concept.
Asset type: ONE production sprite atlas for a PC specifications card editor, series COLOR. Generate a square 2048x2048 PNG with genuinely transparent alpha background.
Primary request: a perfectly regular 4-column by 4-row sprite sheet containing exactly 16 separate, recognizable computer hardware pictograms. Each cell occupies exactly one quarter of the canvas width and height. Keep every object wholly inside its own cell with 10% empty padding on every edge. Center each icon precisely in its cell. No grid lines, no cell backgrounds, no labels, no letters, no numbers, no text anywhere, no logos, no watermark, no shadows outside the objects. Do not put a checkerboard into the image; background must be actual alpha transparency.
Style: ONE cohesive COLOR icon family: bold deep navy outlines, opaque teal, blue, warm amber and ivory fills. Friendly flat editorial technology illustrations, subtle consistent three-quarter depth where useful. Clean chunky silhouettes with only 2-4 structural details. Same outline weight and visual density throughout, no photorealistic texture, no tiny circuitry. Balanced apparent size and recognizable at 24-40 pixels tall.
Required cell order, strictly left to right:
Row 1: CPU square chip with pins on four edges; motherboard square circuit board with CPU socket and 2 slots; RAM long memory stick with 4 rectangular chips and bottom contacts; graphics card horizontal dual-fan GPU with mounting bracket.
Row 2: solid state drive 2.5-inch rectangular closed enclosure with small SATA connector, no exposed platter; hard disk drive with visible round platter and read arm; power supply unit cube with round fan grille plus AC socket; desktop PC tower case with front intake panels and power button.
Row 3: CPU air cooler with a fan in front of a stack of metal fins; widescreen monitor on a stand; a matched pair of stereo speaker boxes shown as one paired icon; computer mouse with scroll wheel.
Row 4: keyboard with compact block keys; over-ear headset with headband and small microphone boom; desktop microphone on a short stand; a simple jigsaw puzzle piece representing a generic/custom component.
Keep all 16 objects separate. This exact 4x4 atlas will be read directly by application code.
```

## Pixel

```text
Use case: stylized-concept.
Asset type: ONE production sprite atlas for a PC specifications card editor, series PIXEL. Generate a square 2048x2048 PNG with genuinely transparent alpha background.
Primary request: a perfectly regular 4-column by 4-row sprite sheet containing exactly 16 separate, recognizable computer hardware pictograms. Each cell occupies exactly one quarter of the canvas width and height. Keep every object wholly inside its own cell with 10% empty padding on every edge. Center each icon precisely in its cell. No grid lines, no cell backgrounds, no labels, no letters, no numbers, no text anywhere, no logos, no watermark, no shadows outside the objects. Do not put a checkerboard into the image; background must be actual alpha transparency.
Style: ONE cohesive PIXEL ART icon family: authentic chunky 32-bit era computer inventory sprites. Crisp square pixel steps, limited teal/cyan, lavender, amber, ivory and dark navy palette, 2-3 shading tones and thick dark pixel outlines. All sixteen use the SAME virtual pixel size and visual scale. No soft gradients, no antialiasing, no blurry glow. Opaque device interiors and genuinely transparent empty space. Keep key silhouettes highly recognizable when scaled down to 32 pixels tall.
Required cell order, strictly left to right:
Row 1: CPU square chip with pins on four edges; motherboard square circuit board with CPU socket and 2 slots; RAM long memory stick with 4 rectangular chips and bottom contacts; graphics card horizontal dual-fan GPU with mounting bracket.
Row 2: solid state drive 2.5-inch rectangular closed enclosure with small SATA connector, no exposed platter; hard disk drive with visible round platter and read arm; power supply unit cube with round fan grille plus AC socket; desktop PC tower case with front intake panels and power button.
Row 3: CPU air cooler with a fan in front of a stack of metal fins; widescreen monitor on a stand; a matched pair of stereo speaker boxes shown as one paired icon; computer mouse with scroll wheel.
Row 4: keyboard with compact block keys; over-ear headset with headband and small microphone boom; desktop microphone on a short stand; a simple jigsaw puzzle piece representing a generic/custom component.
Keep all 16 objects separate. This exact 4x4 atlas will be read directly by application code.
```

