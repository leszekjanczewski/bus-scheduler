package com.leszek.busscheduler.config;

import com.leszek.busscheduler.domain.*;
import com.leszek.busscheduler.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalTime;
import java.util.HashSet;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final BusLineRepository busLineRepository;
    private final BusStopRepository busStopRepository;
    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final TripRepository tripRepository;
    private final DepartureRepository departureRepository;
    private final UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            initializeUsers();
        }
        if (busLineRepository.count() == 0) {
            initializeData();
        }
    }

    private void initializeUsers() {
        User user = User.builder()
                .username("user")
                .email("user@example.com")
                .password(passwordEncoder.encode("password"))
                .roles(java.util.Set.of(Role.ROLE_USER))
                .build();

        User admin = User.builder()
                .username("admin")
                .email("admin@example.com")
                .password(passwordEncoder.encode("admin"))
                .roles(java.util.Set.of(Role.ROLE_USER, Role.ROLE_ADMIN))
                .build();

        userRepository.save(user);
        userRepository.save(admin);
        log.info("--- UŻYTKOWNICY STARTOWI ZAŁADOWANI (user, admin) ---");
    }

    private void initializeData() {
        BusLine line241 = BusLine.builder()
                .lineNumber("241")
                .operator("Gmina Kłodawa")
                .routes(new HashSet<>())
                .build();
        busLineRepository.save(line241);

        BusStop stopGorzow = BusStop.builder().name("Gorzów Dworzec").city("Gorzów Wlkp.").build();
        BusStop stopKlodawa = BusStop.builder().name("Kłodawa Urząd Gminy").city("Kłodawa").build();
        BusStop stopRozanki = BusStop.builder().name("Różanki Szkoła").city("Różanki").build();

        busStopRepository.save(stopGorzow);
        busStopRepository.save(stopKlodawa);
        busStopRepository.save(stopRozanki);

        Route routeA = Route.builder()
                .variantName("Wariant A")
                .direction("Różanki")
                .busLine(line241)
                .routeStops(new HashSet<>())
                .trips(new HashSet<>())
                .build();
        routeRepository.save(routeA);

        createRouteStop(routeA, stopGorzow, 1, 0);
        createRouteStop(routeA, stopKlodawa, 2, 15);
        createRouteStop(routeA, stopRozanki, 3, 25);

        Trip trip1 = Trip.builder()
                .route(routeA)
                .calendarType("WORKDAYS")
                .departures(new HashSet<>())
                .build();
        tripRepository.save(trip1);

        LocalTime startTime = LocalTime.of(14, 15);
        createDeparture(trip1, stopGorzow, startTime);
        createDeparture(trip1, stopKlodawa, startTime.plusMinutes(15));
        createDeparture(trip1, stopRozanki, startTime.plusMinutes(25));

        log.info("--- DANE STARTOWE ZAŁADOWANE (Linia 241) ---");
    }

    private void createRouteStop(Route route, BusStop stop, int sequence, int offsetMinutes) {
        RouteStop rs = RouteStop.builder()
                .route(route)
                .busStop(stop)
                .sequenceNumber(sequence)
                .timeOffsetMinutes(offsetMinutes)
                .build();
        routeStopRepository.save(rs);
    }

    private void createDeparture(Trip trip, BusStop stop, LocalTime time) {
        Departure d = Departure.builder()
                .trip(trip)
                .busStop(stop)
                .departureTime(time)
                .build();
        departureRepository.save(d);
    }
}