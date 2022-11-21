import { createRouter, createWebHistory } from "vue-router";
const routes = [
  {
    path: "/",
    name: "home",
  },
  {
    path: "/room",
    name: "room",
  },
];

const newRoutes = routes.map((route) => {
  return {
    ...route,
    component: () => import(`../views/${route.name}.vue`),
  };
});

const router = createRouter({
  history: createWebHistory("/"),
  routes: newRoutes,
});

export default router;
