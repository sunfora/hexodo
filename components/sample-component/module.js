class SampleComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
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
