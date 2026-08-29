(() => {
  const sourceUrl='./optimizer-builds-v1.js?rev=20260829-1200';
  function fail(message){
    console.error('[Optimizer v4]',message);
    const show=()=>{const switcher=document.querySelector('.uv-mode-switch');if(!switcher||switcher.querySelector('[data-view="optimizer-load-error"]'))return;const note=document.createElement('span');note.dataset.view='optimizer-load-error';note.style.cssText='align-self:center;color:#ff9299;font-size:.62rem;font-weight:800';note.textContent='Optimizer failed to load. Refresh the test page.';switcher.append(note);};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
  }
  function replaceRequired(source,search,replacement,label){if(!source.includes(search))throw new Error(`Patch target missing: ${label}`);return source.replace(search,replacement);}
  function replaceSection(source,startMarker,endMarker,replacement,label){const start=source.indexOf(startMarker);if(start<0)throw new Error(`Patch start missing: ${label}`);const end=source.indexOf(endMarker,start+startMarker.length);if(end<0)throw new Error(`Patch end missing: ${label}`);return source.slice(0,start)+replacement+source.slice(end);}
  async function load(){
    try{
      const response=await fetch(sourceUrl,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      let source=await response.text();
      const patches=window.__OPT_V4_PATCHES||[];
      const tools={replaceRequired,replaceSection};
      for(const patch of patches)source=patch(source,tools);
      (0,eval)(`${source}\n//# sourceURL=optimizer-builds-v4-runtime.js`);
    }catch(error){fail(error?.message||String(error));}
  }
  load();
})();
