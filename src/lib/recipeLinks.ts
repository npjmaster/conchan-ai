const services = [
  {
    name: "クックパッド",
    baseUrl: "https://cookpad.com/search/",
  },
  {
    name: "クラシル",
    baseUrl: "https://www.kurashiru.com/search?query=",
  },
];

export function buildRecipeLinks(dishName: string) {
  return services.map((service) => ({
    serviceName: service.name,
    searchUrl: `${service.baseUrl}${encodeURIComponent(dishName)}`,
  }));
}
