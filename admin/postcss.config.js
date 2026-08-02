/** Admin uses plain CSS (styles.css), not Tailwind. Prevent Vite from
 *  picking up the monorepo root postcss.config.mjs (which loads Tailwind
 *  with an empty content array). */
export default {
  plugins: {},
};
