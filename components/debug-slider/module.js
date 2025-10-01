class DebugSlider extends HTMLElement {
  errors = [];
  value = 0;
  clientX = 0;
  clientY = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();

    const body = this.shadowRoot.querySelector("div");

    const kill_nav   = this.shadowRoot.querySelector("#kill");
    const expand_nav = this.shadowRoot.querySelector("#expand");
    const move_nav   = this.shadowRoot.querySelector("#move");

    kill_nav.addEventListener("click", e => {
      this.remove();
    });

    expand_nav.addEventListener("click", e => {
      if (expand_nav.textContent === "+") {
        expand_nav.textContent = "-";
      } else {
        expand_nav.textContent = "+";
      }

      body.classList.toggle("expanded");
    });

    move_nav.addEventListener("mousedown", e => {
      this.dragged = true;
      this.clientX = e.clientX;
      this.clientY = e.clientY;
    });

    document.addEventListener("mouseup", e => {
      if (this.dragged) {
        this.dragged = false;
        
        requestAnimationFrame(() => {
          const {top: btop, left: bleft} = body.getBoundingClientRect();
          body.style.top  = `${btop}px`;
          body.style.left = `${bleft}px`;
          body.style.transform = "none";
        })
      }
    });

    document.addEventListener("mousemove", e => {
      if (this.dragged) {
        const diffX = e.clientX - this.clientX;
        const diffY = e.clientY - this.clientY;
        const transform =  `translate(${diffX}px, ${diffY}px)`;
        body.style.transform = transform;
      }
    });

    const min_element = this.shadowRoot.querySelector("#min");
    const max_element = this.shadowRoot.querySelector("#max");
    const slider_element = this.shadowRoot.querySelector("#slider");
    const value_element = this.shadowRoot.querySelector("#value");
    
    min_element.value = slider_element.getAttribute("min");
    max_element.value = slider_element.getAttribute("max");
    value_element.value = slider_element.value;

    this.value = slider_element.value;

    slider_element.addEventListener("input", e => {
      value_element.value = slider_element.value; 
      this.value = slider_element.value;
      this.dispatchEvent(new InputEvent("input"));
    });

    min_element.addEventListener("input", e => {
      const new_value = this.evalExpr(min_element.value);
      if (new_value !== null) {
        slider_element.setAttribute("min", new_value);
        min_element.classList.remove("error");
      } else {
        min_element.classList.add("error");
      }
    });

    max_element.addEventListener("input", e => {
      const new_value = this.evalExpr(max_element.value);
      if (new_value !== null) {
        slider_element.setAttribute("max", new_value);
        max_element.classList.remove("error");
      } else {
        max_element.classList.add("error");
      }
    });

    value_element.addEventListener("input", e => {
      const new_value = this.evalExpr(value_element.value);
      if (new_value !== null) {
        slider_element.value = new_value;
        value_element.classList.remove("error");
        this.value = new_value;
        this.dispatchEvent(new InputEvent("input"));
      } else {
        value_element.classList.add("error");
      }
    });
  }
  

  evalExpr(text) {
    try {
      return eval(text)
    } catch (e) {
      this.errors.push(e);
    }
    return null;
  }

  displayErrors() {
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        <?= $componentStyle ?>
      </style>
      <?= $componentHTML ?>
    `;
  }
}
