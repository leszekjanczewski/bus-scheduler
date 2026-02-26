package com.leszek.busscheduler.repository;

import com.leszek.busscheduler.domain.BusStop;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
class BusStopRepositoryTest {

    @Autowired
    private BusStopRepository busStopRepository;

    @Test
    void shouldSaveAndReadBusStopUsingRepository() {
        // given
        BusStop stop = BusStop.builder()
                .name("Testowy Przystanek")
                .city("Kłodawa")
                .latitude(52.2101)
                .longitude(18.9083)
                .build();

        // when
        BusStop saved = busStopRepository.save(stop);

        // then
        assertThat(saved.getId()).isNotNull();

        Optional<BusStop> foundByName = busStopRepository.findByName("Testowy Przystanek");
        assertThat(foundByName).isPresent();
        assertThat(foundByName.get().getCity()).isEqualTo("Kłodawa");
    }
}
