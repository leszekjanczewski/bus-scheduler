export interface ConnectionDTO {
    lineName: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;`r`n    direction: string;
}

export interface BusStopDTO {
    id: number;
    name: string;
    city: string;
    latitude: number;
    longitude: number;`r`n    direction?: string;`r`n    distance?: number;`r`n    directions?: string[];
}


export interface StopDepartureDTO {
    lineName: string;
    departureTime: string;
    direction: string;
}