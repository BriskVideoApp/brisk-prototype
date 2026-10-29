function createAuditCapture(context, captures, actions, fs, root) {
  const dimensions = (bytes) => {
    const buffer = Buffer.from(bytes);
    let position = 2;
    while (position < buffer.length - 9) {
      if (buffer[position] !== 255) { position += 1; continue; }
      const marker = buffer[position + 1];
      if (marker === 0xC0 || marker === 0xC2) return { width: buffer.readUInt16BE(position + 7), height: buffer.readUInt16BE(position + 5) };
      if (marker === 0xD8 || marker === 0xD9) { position += 2; continue; }
      position += 2 + buffer.readUInt16BE(position + 2);
    }
    throw new Error('Unsupported screenshot header');
  };
  return async function capture(suffix, coverageIds, state, steps, extra = {}) {
    const metrics = await context.cdp.send('Runtime.evaluate', { expression: 'JSON.stringify({url:location.href,width:innerWidth,height:innerHeight,x:scrollX,y:scrollY,dpr:devicePixelRatio,focusHTML:document.activeElement?.outerHTML?.slice(0,700)})', returnByValue: true });
    const page = JSON.parse(metrics.result.value);
    if (!page.url.startsWith('http://127.0.0.1:8769/')) throw new Error('Unexpected audit origin');
    const next = Math.max(0, ...captures.map((item) => Number(item.id.slice(1,4)))) + 1;
    const id = `J${String(next).padStart(3, '0')}-${suffix}`;
    const dom = await context.tab.playwright.domSnapshot();
    const raw = await context.cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, captureBeyondViewport: true, fromSurface: true, clip: { x: page.x, y: page.y, width: page.width, height: page.height, scale: 1 } });
    const image = Buffer.from(raw.data, 'base64');
    const size = dimensions(image);
    if (size.width !== page.width || size.height !== page.height) throw new Error('Screenshot bounds do not match viewport');
    const file = `evidence/${id}.jpg`;
    await fs.writeFile(`${root}/${file}`, image);
    await fs.writeFile(`${root}/evidence/${id}.dom.txt`, dom);
    const before = captures.at(-1)?.id;
    captures.push({ id, role: context.role, scenario: context.scenario, state, file, coverageIds, width: page.width, height: page.height, dpr: page.dpr, imageWidth: size.width, imageHeight: size.height, scrollX: page.x, scrollY: page.y, url: page.url, captured: new Date().toISOString(), notes: 'Isolated8769; genuine CDP viewport capture, dimensions checked' });
    actions.push({ id, actionId: id, coverageIds, role: context.role, scenario: context.scenario, state, url: page.url, width: page.width, height: page.height, beforeCaptureId: before, afterCaptureId: id, actions: steps, focus: page.focusHTML, sampleMutation: false, ...extra });
    await fs.writeFile(`${root}/data/c-completion-captures.json`, JSON.stringify(captures,null,2));
    await fs.writeFile(`${root}/data/c-completion-actions.json`, JSON.stringify(actions,null,2));
    nodeRepl.write({id, role:context.role, url:page.url, width:page.width,height:page.height});
    return image;
  };
}
createAuditCapture;
