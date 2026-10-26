// UI helpers shared by all scenes. With Gemini's assets loaded they use the text-free frames
// from pulse_ui (all text is rendered here); otherwise they draw simple shapes.
Pulse.UI = {
  // The tileable grid used behind menus and gameplay (created once per game).
  backdropTextures(scene) {
    const tex = scene.textures;
    if (tex.exists('pulse_grid')) return;
    const t = tex.createCanvas('pulse_grid', 90, 90);
    const g = t.getContext();
    g.strokeStyle = 'rgba(30,107,255,0.16)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0.5, 0);
    g.lineTo(0.5, 90);
    g.moveTo(0, 0.5);
    g.lineTo(90, 0.5);
    g.stroke();
    g.fillStyle = 'rgba(80,160,255,0.35)';
    g.fillRect(0, 0, 3, 3);
    t.refresh();
  },

  sprites() {
    return !!Pulse.Assets.ok;
  },

  text(scene, x, y, str, size, color, bold) {
    return scene.add.text(x, y, str, {
      fontFamily: Pulse.THEME.font, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal',
      align: 'center', wordWrap: { width: 500 },
    }).setOrigin(0.5);
  },

  // Wires press feedback and the action onto an interactive object inside a container.
  wire(box, hit, onPress) {
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (!box.visible) return;
      box.setScale(0.96);
      onPress();
    });
    const restore = () => box.setScale(1);
    hit.on('pointerup', restore);
    hit.on('pointerout', restore);
    box.setEnabled = (on) => {
      box.setVisible(on).setScale(1);
      if (on) hit.setInteractive({ useHandCursor: true });
      else hit.disableInteractive();
      return box;
    };
    return box;
  },

  // A labelled button w × h game px. opts: { primary: 'cyan' | 'mint', size, depth, fill, edge, color }.
  button(scene, x, y, w, h, label, onPress, opts) {
    opts = opts || {};
    const T = Pulse.THEME;
    let bg;
    if (this.sprites()) {
      // 480x140 frame drawn at half scale; nine-slice keeps the chamfered corners crisp at any size.
      const frame = `ui_btn_primary_${opts.primary === 'mint' ? 'mint' : 'cyan'}_up`;
      bg = scene.add.nineslice(0, 0, 'pulse_ui', frame, w * 2, h * 2, 56, 56, 44, 44).setScale(0.5);
    } else {
      bg = scene.add.rectangle(0, 0, w, h, opts.fill || T.panel).setStrokeStyle(2, opts.edge || T.panelEdge);
    }
    const txt = this.text(scene, 0, 0, label, opts.size || 28, opts.color || T.text, true);
    const box = scene.add.container(x, y, [bg, txt]).setDepth(opts.depth || 20);
    box.label = txt;
    return this.wire(box, bg, onPress);
  },

  // A square icon button (e.g. pause); falls back to a labelled box.
  iconButton(scene, x, y, size, frame, fallbackLabel, onPress) {
    if (!this.sprites()) return this.button(scene, x, y, size, size, fallbackLabel, onPress, { size: 26 });
    const img = scene.add.image(0, 0, 'pulse_ui', frame);
    img.setScale(size / img.width);
    const box = scene.add.container(x, y, [img]).setDepth(20);
    box.label = { setText() { return this; } };
    return this.wire(box, img, onPress);
  },

  // World intro banner (Gemini v4, 512×160, emblem in its left ~20%) with the world's name set
  // to the right of the emblem. Returns the objects so callers can show/hide them.
  worldBanner(scene, x, y, world, width, depth) {
    const T = Pulse.THEME;
    const label = `WORLD ${world.index} · ${world.name.toUpperCase()}`;
    if (!this.sprites()) return [this.text(scene, x, y, label, 18, T.text, true).setDepth(depth || 0)];
    const img = scene.add.image(x, y, world.banner).setDisplaySize(width, (width * 160) / 512).setDepth(depth || 0);
    const left = x - width / 2 + width * 0.22;
    const txt = scene.add.text(left, y, label, { fontFamily: T.font, fontSize: '16px', fontStyle: 'bold', color: T.text })
      .setOrigin(0, 0.5).setDepth((depth || 0) + 1);
    const room = width * 0.74;
    if (txt.width > room) txt.setScale(room / txt.width);
    return [img, txt];
  },

  // Row of `max` stars, `count` filled. Sprite images are pushed to `images` so callers can
  // destroy them; the shape fallback draws into `g`.
  stars(scene, g, cx, y, r, count, max, images, depth) {
    if (!this.sprites()) {
      Pulse.Render.stars(g, cx, y, r, count, max);
      return;
    }
    const step = r * 2.4;
    const x0 = cx - ((max - 1) * step) / 2;
    for (let i = 0; i < max; i++) {
      const img = scene.add.image(x0 + i * step, y, 'pulse_ui', i < count ? 'ui_star_filled' : 'ui_star_empty')
        .setScale((r * 2.2) / 64).setDepth(depth || 21);
      if (images) images.push(img);
    }
  },
};
