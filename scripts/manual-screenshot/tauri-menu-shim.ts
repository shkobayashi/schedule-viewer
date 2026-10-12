async function noopItem() {
  return {};
}

export const Menu = {
  new: async () => ({}),
  default: async () => ({}),
};

export const MenuItem = {
  new: async () => noopItem(),
};

export const Submenu = {
  new: async () => ({}),
};

export const PredefinedMenuItem = {
  new: async () => noopItem(),
};
