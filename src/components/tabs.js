/**
 * Tabs — sistema de tabs reutilizable para modales y páginas.
 * 
 * @param {Object[]} tabs - Array de objetos {id, label, icon, content}
 * @param {string} initialTab - ID del tab inicial (default: primer tab)
 * @returns {HTMLElement} - Contenedor de tabs
 */
export function createTabs(tabs, initialTab = null) {
  const container = document.createElement("div");
  container.style.cssText = "display:flex;flex-direction:column;";
  
  // Header con botones de tabs
  const tabsHeader = document.createElement("div");
  tabsHeader.style.cssText =
    "display:flex;gap:0;border-bottom:2px solid #e5e5e5;margin:0.8rem 0 1rem;";
  
  // Contenedor de contenido
  const tabsContent = document.createElement("div");
  
  let activeTab = initialTab || tabs[0]?.id;
  
  // Crear botones de tabs
  tabs.forEach(tab => {
    const btn = document.createElement("button");
    btn.id = `tab-btn-${tab.id}`;
    btn.innerHTML = `${tab.icon ? tab.icon + " " : ""}${tab.label}`;
    btn.style.cssText =
      "padding:8px 18px;border:none;background:none;cursor:pointer;" +
      "font-size:0.85rem;font-weight:600;color:#666;" +
      "border-bottom:3px solid transparent;transition:all 0.2s;" +
      "white-space:nowrap;";
    
    const updateStyle = () => {
      if (activeTab === tab.id) {
        btn.style.color = "#2a5db0";
        btn.style.borderBottomColor = "#4c78a8";
      } else {
        btn.style.color = "#666";
        btn.style.borderBottomColor = "transparent";
      }
    };
    
    btn.addEventListener("click", () => {
      activeTab = tab.id;
      // Actualizar estilos de todos los botones
      tabsHeader.querySelectorAll("button").forEach(b => {
        const tabId = b.id.replace("tab-btn-", "");
        if (tabId === activeTab) {
          b.style.color = "#2a5db0";
          b.style.borderBottomColor = "#4c78a8";
        } else {
          b.style.color = "#666";
          b.style.borderBottomColor = "transparent";
        }
      });
      // Mostrar contenido del tab activo
      renderContent();
    });
    
    btn.addEventListener("mouseover", () => {
      if (activeTab !== tab.id) btn.style.color = "#333";
    });
    btn.addEventListener("mouseout", () => {
      if (activeTab !== tab.id) btn.style.color = "#666";
    });
    
    updateStyle();
    tabsHeader.appendChild(btn);
  });
  
  function renderContent() {
    const activeTabObj = tabs.find(t => t.id === activeTab);
    if (activeTabObj) {
      tabsContent.innerHTML = "";
      if (typeof activeTabObj.content === "function") {
        const content = activeTabObj.content();
        if (content instanceof HTMLElement) {
          tabsContent.appendChild(content);
        } else {
          tabsContent.innerHTML = content;
        }
      } else if (activeTabObj.content instanceof HTMLElement) {
        tabsContent.appendChild(activeTabObj.content);
      } else {
        tabsContent.innerHTML = activeTabObj.content;
      }
    }
  }
  
  container.appendChild(tabsHeader);
  container.appendChild(tabsContent);
  
  // Renderizar contenido inicial
  renderContent();
  
  return container;
}
