package com.leszek.busscheduler.service.impl;

import com.leszek.busscheduler.domain.BusLine;
import com.leszek.busscheduler.repository.BusLineRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusLineServiceImplTest {

    @Mock
    private BusLineRepository busLineRepository;

    @InjectMocks
    private BusLineServiceImpl busLineService;

    @Test
    @DisplayName("Should return list of all bus lines from repository")
    void shouldReturnAllBusLines() {
        // given
        BusLine line1 = BusLine.builder()
                .id(1L)
                .lineNumber("101")
                .operator("ZTM")
                .build();
        
        BusLine line2 = BusLine.builder()
                .id(2L)
                .lineNumber("102")
                .operator("ZTM")
                .build();

        when(busLineRepository.findAll()).thenReturn(List.of(line1, line2));

        // when
        List<BusLine> result = busLineService.findAll();

        // then
        assertThat(result).hasSize(2);
        assertThat(result).extracting(BusLine::getLineNumber)
                .containsExactlyInAnyOrder("101", "102");
        assertThat(result.get(0).getOperator()).isEqualTo("ZTM");
    }
}
