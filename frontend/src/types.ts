export interface ConnectionDTO {
    lineName: string;
    departureTime: string;
    arrivalTime: string;
    durationMinutes: number;    direction: string;
}

export interface BusStopDTO {
  id: number;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  direction?: string;
  distance?: number;
  directions?: string[];
}


export interface StopDepartureDTO {
    lineName: string;
    departureTime: string;
    direction: string;
}