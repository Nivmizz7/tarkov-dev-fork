import jp from "jsonpath";

const apiUrlProd = "https://json.tarkov.dev/";
const apiUrlDev = "https://json-dev.tarkov.dev/";
const apiUrl = apiUrlProd;

const apiFetch = (path) => {
    return fetch(`${apiUrl}${path}`, {
        cache: "no-cache",
        headers: {
            Accept: "application/json",
        },
    }).then((response) => {
        if (!response.ok) {
            return Promise.reject(new Error(`${response.status} ${response.statusText}`));
        }
        return response.json();
    });
};

export default async function apiRequest(path, options = {}) {
    const langFallback = options.langFallback ?? "en";
    // make the request plus any necessary translation requests
    const [responseData, langPrimaryData, langFallbackData] = await Promise.all([
        apiFetch(path), // main data request
        new Promise((resolve, reject) => {
            if (!options.lang) {
                return resolve();
            }
            apiFetch(`${path}_${options.lang}`).then(resolve).catch(reject);
        }),
        new Promise((resolve, reject) => {
            if (!options.lang || options.lang === langFallback) {
                return resolve({});
            }
            apiFetch(`${path}_${langFallback}`).then(resolve).catch(reject);
        }),
    ]);
    if (!langPrimaryData) {
        // no translation necessary
        return responseData.data;
    }
    // merge fallback translation into primary translation
    const langData = {
        ...langFallbackData.data,
        ...langPrimaryData.data,
    };
    // merge translations using jsonpath
    for (const jPath of responseData.translations ?? []) {
        try {
            jp.apply(responseData, jPath, (key) => {
                return langData[key] ?? key;
            });
        } catch (error) {
            console.error(error);
        }
    }
    return responseData.data;
}
