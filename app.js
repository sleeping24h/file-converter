/* 文件转换 - 纯前端本地转换工具
 * 所有转换都在浏览器里完成，不上传服务器。
 * 转换组件按需加载：优先 BootCDN（国内），失败自动切换 jsDelivr。
 */
(function () {
  'use strict';

  /* ---------------- 转换组件（CDN 优先 BootCDN，备用 jsDelivr） ---------------- */
  var BOOT = 'https://cdn.bootcdn.net/ajax/libs/';
  var JSD = 'https://cdn.jsdelivr.net/npm/';
  var LIBS = {
    pdfjs: {
      test: function () { return typeof window.pdfjsLib !== 'undefined'; },
      urls: [BOOT + 'pdf.js/3.11.174/pdf.min.js', JSD + 'pdfjs-dist@3.11.174/build/pdf.min.js'],
      worker: [BOOT + 'pdf.js/3.11.174/pdf.worker.min.js', JSD + 'pdfjs-dist@3.11.174/build/pdf.worker.min.js']
    },
    mammoth: {
      test: function () { return typeof window.mammoth !== 'undefined'; },
      urls: [BOOT + 'mammoth/1.6.0/mammoth.browser.min.js', JSD + 'mammoth@1.6.0/mammoth.browser.min.js']
    },
    jszip: {
      test: function () { return typeof window.JSZip !== 'undefined'; },
      urls: [BOOT + 'jszip/3.10.1/jszip.min.js', JSD + 'jszip@3.10.1/dist/jszip.min.js']
    },
    html2canvas: {
      test: function () { return typeof window.html2canvas !== 'undefined'; },
      urls: [BOOT + 'html2canvas/1.4.1/html2canvas.min.js', JSD + 'html2canvas@1.4.1/dist/html2canvas.min.js']
    },
    jspdf: {
      test: function () { return typeof window.jspdf !== 'undefined'; },
      urls: [BOOT + 'jspdf/2.5.1/jspdf.umd.min.js', JSD + 'jspdf@2.5.1/dist/jspdf.umd.min.js']
    }
  };
  var LIB_NAMES = { pdfjs: 'PDF 组件', mammoth: 'Word 组件', jszip: 'ZIP 组件', html2canvas: '页面渲染组件', jspdf: 'PDF 生成组件' };
  var loadedLibs = {};

  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () { resolve(url); };
      s.onerror = function () { reject(new Error('加载失败：' + url)); };
      document.head.appendChild(s);
    });
  }

  /* 按需加载某组件：依次尝试 BootCDN → jsDelivr，全部失败才报错 */
  function ensureLib(key) {
    if (loadedLibs[key]) return Promise.resolve(loadedLibs[key]);
    var def = LIBS[key];
    if (def.test()) {
      loadedLibs[key] = { cdn: '已内置', url: '' };
      return Promise.resolve(loadedLibs[key]);
    }
    var chain = Promise.reject();
    def.urls.forEach(function (url, i) {
      chain = chain.catch(function () {
        return loadScript(url).then(function () {
          if (!def.test()) throw new Error('组件未就绪：' + key);
          if (key === 'pdfjs' && window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = def.worker[i];
          }
          loadedLibs[key] = { cdn: i === 0 ? 'BootCDN' : 'jsDelivr', url: url };
          updateLibStatus();
          return loadedLibs[key];
        });
      });
    });
    return chain.catch(function () {
      throw new Error(LIB_NAMES[key] + '加载失败，请检查网络后重试（已尝试 BootCDN 与 jsDelivr）');
    });
  }

  /* ---------------- 工具函数 ---------------- */
  function $(id) { return document.getElementById(id); }
  function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
  function extOf(name) {
    var m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }
  function baseName(name) {
    var i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  }
  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
  }
  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (b) {
        if (b) { resolve(b); return; }
        /* 浏览器不支持该格式（如旧版 Safari 不支持 WebP），退回 PNG */
        canvas.toBlob(function (b2) { resolve(b2); }, 'image/png');
      }, type, quality);
    });
  }
  function setStatus(msg, isErr) {
    var el = $('status');
    el.textContent = msg || '';
    el.className = isErr ? 'err' : '';
  }
  function updateLibStatus() {
    var parts = [];
    Object.keys(loadedLibs).forEach(function (k) {
      parts.push(LIB_NAMES[k] + '：' + loadedLibs[k].cdn + '已加载');
    });
    $('libStatus').textContent = parts.join('　·　');
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- 文件类型与目标格式 ---------------- */
  function kindOf(file) {
    var ext = extOf(file.name);
    if (ext === 'pdf') return 'pdf';
    if (ext === 'docx') return 'docx';
    if (ext === 'doc') return 'doc';
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].indexOf(ext) >= 0) return 'image';
    if (ext === 'txt' || ext === 'md' || ext === 'markdown') return 'text';
    if (ext === 'csv') return 'csv';
    if (ext === 'json') return 'json';
    return 'other';
  }
  var KIND_LABEL = { pdf: 'PDF', docx: 'Word', doc: 'Word(老版)', image: '图片', text: '文本', csv: 'CSV', json: 'JSON', other: '文件' };
  var TARGETS = {
    pdf: [['png', 'PNG 图片（每页一张）'], ['jpg', 'JPG 图片（每页一张）'], ['txt', 'TXT 文本'], ['zip', 'ZIP 打包'], ['base64', 'Base64 文本']],
    docx: [['png', 'PNG 图片（每页一张）'], ['pdf', 'PDF'], ['html', 'HTML 网页'], ['txt', 'TXT 文本'], ['zip', 'ZIP 打包'], ['base64', 'Base64 文本']],
    doc: [],
    image: [['png', 'PNG'], ['jpg', 'JPG'], ['webp', 'WebP'], ['pdf', 'PDF（每张图一个文件）'], ['zip', 'ZIP 打包'], ['base64', 'Base64 文本']],
    text: [['png', 'PNG 图片'], ['pdf', 'PDF'], ['dos', 'DOS 格式（CRLF）'], ['zip', 'ZIP 打包'], ['base64', 'Base64 文本']],
    csv: [['json', 'JSON'], ['zip', 'ZIP 打包'], ['base64', 'Base64 文本']],
    json: [['csv', 'CSV'], ['zip', 'ZIP 打包'], ['base64', 'Base64 文本']],
    other: [['zip', 'ZIP 打包'], ['base64', 'Base64 文本']]
  };

  /* ---------------- 状态 ---------------- */
  var files = [];    /* {id, file, kind, target, status} */
  var results = [];  /* {id, name, blob, size, url} */
  var uid = 0;

  /* ---------------- 文件接收：拖放 / 选择 / 粘贴 ---------------- */
  function addFiles(list) {
    var added = 0;
    Array.prototype.forEach.call(list, function (f) {
      if (!f || !f.name) return;
      var kind = kindOf(f);
      var targets = TARGETS[kind];
      files.push({ id: ++uid, file: f, kind: kind, target: targets.length ? targets[0][0] : '', status: '' });
      added++;
    });
    if (added) {
      renderFiles();
      setStatus('已添加 ' + added + ' 个文件，选择目标格式后点「全部转换」。');
    }
  }

  function renderFiles() {
    var list = $('fileList');
    list.innerHTML = '';
    $('fileCount').textContent = files.length ? '（共 ' + files.length + ' 个）' : '';
    $('convertAllBtn').disabled = !files.length;
    $('clearFilesBtn').disabled = !files.length;
    if (!files.length) {
      list.innerHTML = '<div class="empty">还没有添加文件。拖入文件或点击上方区域选择。</div>';
      return;
    }
    files.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'file-item';
      var nameHtml = '<span class="fname">' + esc(item.file.name) + '</span>' +
        '<span class="fmeta">' + KIND_LABEL[item.kind] + ' · ' + fmtSize(item.file.size) + '</span>';
      if (item.kind === 'doc') {
        div.innerHTML = nameHtml +
          '<span class="st err">老版 .doc 无法在浏览器里解析，请先用 Word / WPS 另存为 .docx 再转换。</span>' +
          '<button class="btn ghost small" data-act="remove">移除</button>';
      } else {
        var opts = TARGETS[item.kind].map(function (t) {
          return '<option value="' + t[0] + '"' + (t[0] === item.target ? ' selected' : '') + '>' + t[1] + '</option>';
        }).join('');
        div.innerHTML = nameHtml +
          '<select data-act="target" aria-label="目标格式">' + opts + '</select>' +
          '<span class="st' + (item.statusCls ? ' ' + item.statusCls : '') + '">' + esc(item.status || '') + '</span>' +
          '<button class="btn small" data-act="convert">转换</button>' +
          '<button class="btn ghost small" data-act="remove">移除</button>';
      }
      div.querySelector('[data-act="remove"]').addEventListener('click', function () {
        files = files.filter(function (x) { return x.id !== item.id; });
        renderFiles();
      });
      var sel = div.querySelector('[data-act="target"]');
      if (sel) sel.addEventListener('change', function () { item.target = sel.value; });
      var cv = div.querySelector('[data-act="convert"]');
      if (cv) cv.addEventListener('click', function () { convertOneItem(item); });
      list.appendChild(div);
    });
  }

  /* ---------------- 结果列表 ---------------- */
  function renderResults() {
    var list = $('resultList');
    list.innerHTML = '';
    $('resultCount').textContent = results.length ? '（共 ' + results.length + ' 个）' : '';
    $('downloadAllBtn').disabled = !results.length;
    $('clearResultsBtn').disabled = !results.length;
    if (!results.length) {
      list.innerHTML = '<div class="empty">转换完成后，结果会出现在这里，可以逐个下载，也可以一键打包。</div>';
      return;
    }
    results.forEach(function (r) {
      var div = document.createElement('div');
      div.className = 'res-item';
      div.innerHTML = '<span class="rname">' + esc(r.name) + '</span>' +
        '<span class="rmeta">' + fmtSize(r.size) + '</span>';
      var btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = '下载';
      btn.addEventListener('click', function () { saveBlob(r.blob, r.name); });
      div.appendChild(btn);
      list.appendChild(div);
    });
  }
  function pushResults(out) {
    out.forEach(function (o) {
      results.push({ id: ++uid, name: o.name, blob: o.blob, size: o.blob.size });
    });
    renderResults();
  }

  /* ---------------- PDF 转换（pdf.js） ---------------- */
  function pdfScale() { return parseFloat($('pdfScale').value) || 2; }
  function imgQuality() { return (parseInt($('quality').value, 10) || 90) / 100; }

  function pdfToImages(file, format) {
    return ensureLib('pdfjs').then(function () {
      return file.arrayBuffer();
    }).then(function (data) {
      return window.pdfjsLib.getDocument({ data: data }).promise;
    }).then(function (pdf) {
      var seq = Promise.resolve();
      var out = [];
      var _loop = function (p) {
        seq = seq.then(function () {
          return pdf.getPage(p).then(function (page) {
            var viewport = page.getViewport({ scale: pdfScale() });
            var canvas = document.createElement('canvas');
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            var ctx = canvas.getContext('2d');
            return page.render({ canvasContext: ctx, viewport: viewport }).promise.then(function () {
              var type = format === 'jpg' ? 'image/jpeg' : 'image/png';
              return canvasToBlob(canvas, type, imgQuality());
            }).then(function (blob) {
              out.push({ name: baseName(file.name) + '-p' + p + '.' + format, blob: blob });
            });
          });
        });
      };
      for (var p = 1; p <= pdf.numPages; p++) _loop(p);
      return seq.then(function () { return out; });
    });
  }

  function pdfToText(file) {
    return ensureLib('pdfjs').then(function () {
      return file.arrayBuffer();
    }).then(function (data) {
      return window.pdfjsLib.getDocument({ data: data }).promise;
    }).then(function (pdf) {
      var seq = Promise.resolve();
      var parts = [];
      var _loop2 = function (p) {
        seq = seq.then(function () {
          return pdf.getPage(p).then(function (page) {
            return page.getTextContent();
          }).then(function (tc) {
            var line = tc.items.map(function (it) { return it.str; }).join('');
            parts.push('—— 第 ' + p + ' 页 ——\n' + line);
          });
        });
      };
      for (var p = 1; p <= pdf.numPages; p++) _loop2(p);
      return seq.then(function () {
        return [{ name: baseName(file.name) + '.txt', blob: new Blob([parts.join('\n\n')], { type: 'text/plain;charset=utf-8' }) }];
      });
    });
  }

  /* ---------------- Word(.docx) 转换（mammoth + html2canvas） ---------------- */
  function waitImages(root) {
    var imgs = root.querySelectorAll('img');
    var jobs = [];
    Array.prototype.forEach.call(imgs, function (img) {
      if (img.complete) return;
      jobs.push(new Promise(function (res) {
        var done = function () { res(); };
        img.onload = done;
        img.onerror = done;
        setTimeout(done, 5000);
      }));
    });
    return Promise.all(jobs);
  }

  /* 把 docx 渲染成一页页 A4 画布（图片/PDF 共用） */
  function docxPages(file) {
    return ensureLib('mammoth').then(function () { return ensureLib('html2canvas'); })
      .then(function () { return file.arrayBuffer(); })
      .then(function (buf) {
        return window.mammoth.convertToHtml({ arrayBuffer: buf });
      }).then(function (res) {
        return res.value;
      }).then(function (html) {
        var host = $('renderHost');
        host.innerHTML = '';
        var content = document.createElement('div');
        content.style.cssText = 'width:794px;padding:48px;background:#fff;color:#111111;font-size:16px;line-height:1.7;word-wrap:break-word;';
        content.innerHTML = html;
        host.appendChild(content);
        return waitImages(content).then(function () {
          var contentH = 1027; /* 1123 - 上下各 48px 边距 */
          var total = content.scrollHeight;
          var pages = Math.max(1, Math.ceil(total / contentH));
          var seq = Promise.resolve();
          var canvases = [];
          var _loop3 = function (i) {
            seq = seq.then(function () {
              var pageDiv = document.createElement('div');
              pageDiv.style.cssText = 'width:794px;height:1123px;overflow:hidden;background:#fff;position:relative;';
              var inner = document.createElement('div');
              inner.style.cssText = 'width:794px;padding:48px;background:#fff;color:#111111;font-size:16px;line-height:1.7;word-wrap:break-word;margin-top:' + (-i * contentH) + 'px;';
              inner.innerHTML = html;
              pageDiv.appendChild(inner);
              host.appendChild(pageDiv);
              return waitImages(inner).then(function () {
                return window.html2canvas(pageDiv, { scale: pdfScale(), backgroundColor: '#ffffff' });
              }).then(function (c) {
                canvases.push(c);
                pageDiv.remove();
              });
            });
          };
          for (var i = 0; i < pages; i++) _loop3(i);
          return seq.then(function () {
            host.innerHTML = '';
            return canvases;
          });
        });
      });
  }

  function docxToImages(file, format) {
    return docxPages(file).then(function (pages) {
      var seq = Promise.resolve();
      var out = [];
      pages.forEach(function (c, i) {
        seq = seq.then(function () {
          var type = format === 'jpg' ? 'image/jpeg' : 'image/png';
          return canvasToBlob(c, type, imgQuality());
        }).then(function (blob) {
          out.push({ name: baseName(file.name) + '-p' + (i + 1) + '.' + format, blob: blob });
        });
      });
      return seq.then(function () { return out; });
    });
  }

  function docxToPdf(file) {
    return ensureLib('jspdf').then(function () {
      return docxPages(file);
    }).then(function (pages) {
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pages.forEach(function (c, i) {
        if (i > 0) doc.addPage();
        doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      });
      return [{ name: baseName(file.name) + '.pdf', blob: doc.output('blob') }];
    });
  }

  function docxToText(file) {
    return ensureLib('mammoth').then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      return window.mammoth.extractRawText({ arrayBuffer: buf });
    }).then(function (res) {
      return [{ name: baseName(file.name) + '.txt', blob: new Blob([res.value], { type: 'text/plain;charset=utf-8' }) }];
    });
  }

  function docxToHtml(file) {
    return ensureLib('mammoth').then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      return window.mammoth.convertToHtml({ arrayBuffer: buf });
    }).then(function (res) {
      var doc = '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>' +
        esc(baseName(file.name)) + '</title>\n<style>body{max-width:760px;margin:40px auto;padding:0 20px;' +
        'font-family:"PingFang SC","Microsoft YaHei",sans-serif;line-height:1.7;color:#111}img{max-width:100%}' +
        'table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 10px}</style>\n</head>\n<body>\n' +
        res.value + '\n</body>\n</html>';
      return [{ name: baseName(file.name) + '.html', blob: new Blob([doc], { type: 'text/html;charset=utf-8' }) }];
    });
  }

  /* ---------------- 图片转换（canvas / jsPDF） ---------------- */
  function loadImage(file) {
    var url = URL.createObjectURL(file);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('图片无法解码，可能已损坏或格式不受支持')); };
      img.src = url;
    });
  }

  function imageConvert(file, format) {
    return loadImage(file).then(function (img) {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      if (format === 'jpg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
      ctx.drawImage(img, 0, 0);
      var type = format === 'jpg' ? 'image/jpeg' : (format === 'webp' ? 'image/webp' : 'image/png');
      return canvasToBlob(canvas, type, imgQuality());
    }).then(function (blob) {
      return [{ name: baseName(file.name) + '.' + format, blob: blob }];
    });
  }

  function imageToPdf(file) {
    return ensureLib('jspdf').then(function () {
      return loadImage(file);
    }).then(function (img) {
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      var wMm = img.naturalWidth * 25.4 / 96;
      var hMm = img.naturalHeight * 25.4 / 96;
      var ratio = Math.min(190 / wMm, 277 / hMm, 1);
      var w = wMm * ratio, h = hMm * ratio;
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (210 - w) / 2, (297 - h) / 2, w, h);
      return [{ name: baseName(file.name) + '.pdf', blob: doc.output('blob') }];
    });
  }

  /* ---------------- 文本 / Markdown 转换 ---------------- */
  /* 把纯文本排版成一页页 A4 画布（图片/PDF 共用；用图片方式可正确显示中文） */
  function textPages(text) {
    var W = 794, H = 1123, pad = 48, lineH = 26;
    var font = '15px "PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
    var meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    var maxW = W - pad * 2;
    var lines = [];
    text.split('\n').forEach(function (raw) {
      if (raw === '') { lines.push(''); return; }
      var cur = '';
      Array.prototype.forEach.call(raw, function (ch) {
        var t = cur + ch;
        if (meas.measureText(t).width > maxW && cur) { lines.push(cur); cur = ch; }
        else cur = t;
      });
      lines.push(cur);
    });
    var perPage = Math.floor((H - pad * 2) / lineH);
    var pages = [];
    for (var i = 0; i < lines.length; i += perPage) {
      var c = document.createElement('canvas');
      c.width = W; c.height = H;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#111111';
      ctx.font = font;
      ctx.textBaseline = 'top';
      lines.slice(i, i + perPage).forEach(function (ln, j) {
        ctx.fillText(ln, pad, pad + j * lineH);
      });
      pages.push(c);
    }
    if (!pages.length) {
      var c0 = document.createElement('canvas');
      c0.width = W; c0.height = H;
      var x0 = c0.getContext('2d');
      x0.fillStyle = '#ffffff';
      x0.fillRect(0, 0, W, H);
      pages.push(c0);
    }
    return pages;
  }

  function textToImage(file, format) {
    return file.text().then(function (text) {
      var pages = textPages(text);
      var seq = Promise.resolve();
      var out = [];
      pages.forEach(function (c, i) {
        seq = seq.then(function () {
          var type = format === 'jpg' ? 'image/jpeg' : 'image/png';
          return canvasToBlob(c, type, imgQuality());
        }).then(function (blob) {
          out.push({ name: baseName(file.name) + '-p' + (i + 1) + '.' + format, blob: blob });
        });
      });
      return seq.then(function () { return out; });
    });
  }

  function textToPdf(file) {
    return ensureLib('jspdf').then(function () {
      return file.text();
    }).then(function (text) {
      var pages = textPages(text);
      var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pages.forEach(function (c, i) {
        if (i > 0) doc.addPage();
        doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      });
      return [{ name: baseName(file.name) + '.pdf', blob: doc.output('blob') }];
    });
  }

  function textToDos(file) {
    return file.text().then(function (text) {
      var dos = text.replace(/\r\n?/g, '\n').replace(/\n/g, '\r\n');
      return [{ name: baseName(file.name) + '-dos.txt', blob: new Blob([dos], { type: 'text/plain;charset=utf-8' }) }];
    });
  }

  /* ---------------- CSV ↔ JSON ---------------- */
  function parseCSV(text) {
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; rows.push(row); row = [];
      } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return !(r.length === 1 && r[0] === ''); });
  }
  function csvEsc(v) {
    v = String(v == null ? '' : v);
    return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function csvToJson(file) {
    return file.text().then(function (text) {
      var rows = parseCSV(text);
      if (rows.length < 2) throw new Error('CSV 至少需要标题行和一行数据');
      var heads = rows[0];
      var arr = rows.slice(1).map(function (r) {
        var o = {};
        heads.forEach(function (h, i) { o[h] = r[i] == null ? '' : r[i]; });
        return o;
      });
      return [{ name: baseName(file.name) + '.json', blob: new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json;charset=utf-8' }) }];
    });
  }

  function jsonToCsv(file) {
    return file.text().then(function (text) {
      var data = JSON.parse(text);
      var rows;
      if (Array.isArray(data)) {
        if (!data.length) throw new Error('JSON 数组为空，无法转 CSV');
        if (typeof data[0] === 'object' && data[0] !== null) {
          var keys = [];
          data.forEach(function (o) { Object.keys(o).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
          rows = [keys].concat(data.map(function (o) { return keys.map(function (k) { return o[k] == null ? '' : o[k]; }); }));
        } else {
          rows = [['value']].concat(data.map(function (v) { return [v]; }));
        }
      } else if (typeof data === 'object' && data !== null) {
        rows = [['key', 'value']].concat(Object.keys(data).map(function (k) { return [k, data[k]]; }));
      } else {
        throw new Error('JSON 须为对象或对象数组才能转 CSV');
      }
      var csv = rows.map(function (r) { return r.map(csvEsc).join(','); }).join('\r\n');
      return [{ name: baseName(file.name) + '.csv', blob: new Blob([csv], { type: 'text/csv;charset=utf-8' }) }];
    });
  }

  /* ---------------- 通用：ZIP / Base64 ---------------- */
  function fileToZip(file) {
    return ensureLib('jszip').then(function () {
      var zip = new window.JSZip();
      zip.file(file.name, file);
      return zip.generateAsync({ type: 'blob' });
    }).then(function (blob) {
      return [{ name: baseName(file.name) + '.zip', blob: blob }];
    });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        var b64 = String(r.result).split(',')[1] || '';
        resolve([{ name: file.name + '.base64.txt', blob: new Blob([b64], { type: 'text/plain;charset=utf-8' }) }]);
      };
      r.onerror = function () { reject(new Error('读取文件失败')); };
      r.readAsDataURL(file);
    });
  }

  /* ---------------- 转换分发 ---------------- */
  function convertFile(item) {
    var file = item.file, kind = item.kind, target = item.target;
    if (target === 'zip') return fileToZip(file);
    if (target === 'base64') return fileToBase64(file);
    switch (kind) {
      case 'pdf':
        return target === 'txt' ? pdfToText(file) : pdfToImages(file, target);
      case 'docx':
        if (target === 'png' || target === 'jpg') return docxToImages(file, target);
        if (target === 'pdf') return docxToPdf(file);
        if (target === 'txt') return docxToText(file);
        if (target === 'html') return docxToHtml(file);
        break;
      case 'image':
        if (target === 'pdf') return imageToPdf(file);
        return imageConvert(file, target);
      case 'text':
        if (target === 'dos') return textToDos(file);
        if (target === 'pdf') return textToPdf(file);
        return textToImage(file, target);
      case 'csv':
        return csvToJson(file);
      case 'json':
        return jsonToCsv(file);
    }
    return Promise.reject(new Error('不支持的转换'));
  }

  function setItemStatus(item, text, cls) {
    item.status = text;
    item.statusCls = cls || '';
    renderFiles();
  }

  function convertOneItem(item) {
    if (item.kind === 'doc') return Promise.resolve();
    setItemStatus(item, '转换中…', 'run');
    setStatus('正在转换：' + item.file.name);
    return convertFile(item).then(function (out) {
      pushResults(out);
      setItemStatus(item, '完成（' + out.length + ' 个结果）', 'ok');
      setStatus('完成：' + item.file.name + ' → ' + out.length + ' 个文件，可在下方结果区下载。');
    }).catch(function (e) {
      setItemStatus(item, '失败：' + (e && e.message ? e.message : '未知错误'), 'err');
      setStatus('转换失败：' + item.file.name + ' —— ' + (e && e.message ? e.message : '未知错误'), true);
    });
  }

  function convertAll() {
    var todo = files.filter(function (x) { return x.kind !== 'doc'; });
    if (!todo.length) { setStatus('没有可转换的文件（老版 .doc 不支持）。', true); return; }
    var seq = Promise.resolve();
    todo.forEach(function (item) {
      seq = seq.then(function () { return convertOneItem(item); });
    });
    seq.then(function () { setStatus('全部转换完成，共 ' + results.length + ' 个结果文件。'); });
  }

  /* ---------------- 事件绑定 ---------------- */
  function init() {
    var dz = $('dropzone');
    var input = $('fileInput');

    dz.addEventListener('click', function () { input.click(); });
    dz.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      addFiles(input.files);
      input.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('dragover'); });
    });
    dz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
    document.addEventListener('paste', function (e) {
      if (e.clipboardData && e.clipboardData.files.length) {
        addFiles(e.clipboardData.files);
        setStatus('已从剪贴板添加文件。');
      }
    });

    $('quality').addEventListener('input', function () {
      $('qualityVal').textContent = $('quality').value + '%';
    });

    $('convertAllBtn').addEventListener('click', convertAll);
    $('clearFilesBtn').addEventListener('click', function () {
      files = [];
      renderFiles();
      setStatus('');
    });
    $('downloadAllBtn').addEventListener('click', function () {
      if (!results.length) return;
      setStatus('正在打包 ZIP…');
      ensureLib('jszip').then(function () {
        var zip = new window.JSZip();
        var used = {};
        results.forEach(function (r) {
          var name = r.name, n = 1;
          while (used[name]) { name = baseName(r.name) + '-' + (n++) + '.' + extOf(r.name); }
          used[name] = true;
          zip.file(name, r.blob);
        });
        return zip.generateAsync({ type: 'blob' });
      }).then(function (blob) {
        saveBlob(blob, '转换结果.zip');
        setStatus('已打包下载：转换结果.zip（' + results.length + ' 个文件）。');
      }).catch(function (e) {
        setStatus('打包失败：' + (e && e.message ? e.message : '未知错误'), true);
      });
    });
    $('clearResultsBtn').addEventListener('click', function () {
      results = [];
      renderResults();
    });

    renderFiles();
    renderResults();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
