import { defineNoofpiConfig } from "noofpi";
import { noofpiUi } from "noofpi-ui/vite";

export default defineNoofpiConfig({
  tailwind: true,
  vite: { plugins: [noofpiUi()] },
});
