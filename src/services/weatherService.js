/**
 * Servicio de Clima usando Open-Meteo (Sin necesidad de API Key)
 * Ideal para validaciones automáticas de negocio.
 */

const SEDE_COORDINATES = {
    'costa': { lat: -13.83, lon: -76.25, nombre: 'Paracas' },
    'rural': { lat: -13.33, lon: -72.11, nombre: 'Valle Sagrado' },
    // Por defecto si no se reconoce la sede, usamos Paracas o permitimos null
    'default': { lat: -13.83, lon: -76.25 }
};

export const verificarClimaAdverso = async (sedeId) => {
    try {
        const coords = SEDE_COORDINATES[sedeId.toLowerCase()] || SEDE_COORDINATES['default'];

        // Llamada a Open-Meteo (API Gratuita y sin Key)
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=weather_code,wind_speed_10m&timezone=auto`
        );

        if (!response.ok) throw new Error("Error consultando servicio meteorológico");

        const data = await response.json();
        const current = data.current;

        /**
         * WMO Weather interpretation codes (WW)
         * 51, 53, 55: Llovizna
         * 61, 63, 65: Lluvia
         * 71, 73, 75: Nieve
         * 80, 81, 82: Chubascos
         * 95, 96, 99: Tormenta
         */
        const codigosAdversos = [51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82, 95, 96, 99];
        const vientoLimite = 20; // km/h

        const esLluvia = codigosAdversos.includes(current.weather_code);
        const esVientoFuerte = current.wind_speed_10m > vientoLimite;

        return {
            adverso: esLluvia || esVientoFuerte,
            detalle: esLluvia ? "Luvia detectada" : esVientoFuerte ? "Viento excesivo" : "Clima estable",
            viento: current.wind_speed_10m,
            codigo: current.weather_code
        };

    } catch (error) {
        console.error("Error en weatherService:", error);
        // En caso de error de la API, por seguridad de negocio devolvemos falso 
        // para no regalar reprogramaciones si el servicio falla.
        return { adverso: false, detalle: "Servicio no disponible" };
    }
};
