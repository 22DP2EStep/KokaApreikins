
const { ref, onMounted, watch } = Vue;
const THREE = window.THREE;

export default {
  setup() {
    const loggedIn = ref(false);
    const loginInfo = ref({ name: "", email: "" });
    const loginError = ref("");

    const inputs = ref({
      garums: "",
      platums: "",
      augstums: "",
      stipriba: "",
    });

    const result = ref(null);
    let scene, camera, renderer, beam, controls;

    function isValidEmail(email) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    }

    async function login() {
      if (!loginInfo.value.name || !loginInfo.value.email) {
        loginError.value = "Lūdzu ievadiet vārdu un e-pastu.";
        return;
      }

      if (!isValidEmail(loginInfo.value.email)) {
        loginError.value = "Nederīgs e-pasta formāts.";
        return;
      }
      const response = await fetch("http://localhost:3000/login", {
        
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({email: loginInfo.value.email, name: loginInfo.value.name})
      }); 
      const data = await response.json()
      if (data.isValid){
        loginError.value = "";
        loggedIn.value = true;
      } else{
        window.electronAPI.shutdownApp();
      }
    }

    async function calculate() {
      const augstums = Number(inputs.value.augstums);
      const platums = Number(inputs.value.platums);
      const stipriba = Number(inputs.value.stipriba);
      const garums = Number(inputs.value.garums);

      if (augstums && platums && stipriba && garums) {
        try {
          const response = await fetch("http://localhost:3000/", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ augstums, platums, stipriba, garums })
          });

          const data = await response.json();
          result.value = data;
          updateBeamVisualization();
        } catch (error) {
          console.error("Error fetching data:", error);
          result.value = "Error calculating result";
        }
      } else {
        result.value = "Aizpildiet visus laukus";
      }
    }

    function initThreeJS() {
      const container = document.getElementById('beam-container');

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);

      camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 10000);
      camera.position.set(1000, 1000, 1000);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      container.appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI;

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      scene.add(new THREE.DirectionalLight(0xffffff, 0.8));
      scene.add(new THREE.GridHelper(100, 100, 0x888888, 0x888888));
      scene.add(new THREE.AxesHelper(500));

      updateBeamVisualization();
      animate();
      window.addEventListener('resize', onWindowResize);
    }

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    function updateBeamVisualization() {
      const garums = Number(inputs.value.garums) || 1000;
      const platums = Number(inputs.value.platums) || 100;
      const augstums = Number(inputs.value.augstums) || 200;

      if (beam) scene.remove(beam);

      const geometry = new THREE.BoxGeometry(garums, augstums, platums);
      const material = new THREE.MeshPhongMaterial({ color: 0x8B4513, shininess: 30, side: THREE.DoubleSide });
      beam = new THREE.Mesh(geometry, material);
      scene.add(beam);
      beam.position.set(0, augstums / 2, 0);
      resetCamera();
    }

    function resetCamera() {
      const boundingBox = new THREE.Box3().setFromObject(beam);
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const distance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.1;

      camera.position.copy(center);
      camera.position.x += distance;
      camera.position.y += distance * 0.5;
      camera.position.z += distance;
      camera.lookAt(center);
      controls.target.copy(center);
      controls.update();
    }

    function onWindowResize() {
      const container = document.getElementById('beam-container');
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }

    onMounted(() => {
      watch(inputs, calculate, { deep: true });
    });

    return {
      loggedIn,
      loginInfo,
      loginError,
      login,
      inputs,
      result,
      initThreeJS,
    };
  },
  template: `
    <div v-if="!loggedIn" class="login-form">
      <h2>Pieslēgšanās</h2>
      <input v-model="loginInfo.name" placeholder="Vārds" />
      <input v-model="loginInfo.email" placeholder="E-pasts" />
      <button @click="login">Ieiet</button>
      <p v-if="loginError" style="color: red;">{{ loginError }}</p>
    </div>

    <div v-else class="container" @vue:mounted="initThreeJS()">
      <h2>Koka konstrukciju nestspējas noteikšanas aplikācija</h2>
      <div class="input-group" v-for="(value, key) in inputs" :key="key">
        <label :for="key">{{ key.charAt(0).toUpperCase() + key.slice(1) }} (m)</label>
        <input 
          v-model="inputs[key]" 
          :id="key" 
          type="number" 
          min="1"
          step="1"
        />
      </div>
      <div class="result-section">
        <h3>Pieļaujama slodze uz sijas (Q):</h3>
        <div class="result">{{ result && result.Q ? result.Q : "Ievadiet datus lai aprēķinātu" }}</div>
      </div>
      <div id="beam-container" style="width: 100%; height: 500px; margin-top: 20px;"></div>
      <div class="controls-hint" style="text-align: center; margin-top: 10px; color: #666;">
        <small>Pagrieziet ar peli • Pietuviniet ar ritenīti • Velciet ar labo klikšķi</small>
      </div>
    </div>
  `
};
