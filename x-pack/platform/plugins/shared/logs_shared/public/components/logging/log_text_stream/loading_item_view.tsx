/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiLoadingSpinner,
  EuiButton,
} from '@elastic/eui';
import { FormattedMessage, FormattedTime, FormattedRelative } from '@kbn/i18n-react';
import * as React from 'react';
import { Unit } from '@kbn/datemath';

import styled from '@emotion/styled';
import { LogTextSeparator } from './log_text_separator';
import { extendDatemath } from '../../../utils/datemath';

type Position = 'start' | 'end';

interface LogTextStreamLoadingItemViewProps {
  position: Position;
  timestamp: number; // Either the top of the bottom's cursor timestamp
  startDateExpression: string;
  endDateExpression: string;
  className?: string;
  hasMore: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  onExtendRange?: (newDate: string) => void;
  onStreamStart?: () => void;
}

const TIMESTAMP_FORMAT = {
  hour12: false,
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
} as const;

export class LogTextStreamLoadingItemView extends React.PureComponent<
  LogTextStreamLoadingItemViewProps,
  {}
> {
  public render() {
    const {
      position,
      timestamp,
      startDateExpression,
      endDateExpression,
      className,
      hasMore,
      isLoading,
      isStreaming,
      onExtendRange,
      onStreamStart,
    } = this.props;

    const shouldShowCta = !hasMore && !isStreaming && !isLoading;

    const extra = (
      <LoadingItemViewExtra
        justifyContent="center"
        alignItems="center"
        gutterSize="m"
        {...(shouldShowCta ? { role: 'row' } : {})}
      >
        {(isLoading || isStreaming) && (
          <ProgressSpinner kind={isStreaming ? 'streaming' : 'loading'} />
        )}

        {shouldShowCta && (
          <ProgressCta
            position={position}
            onStreamStart={onStreamStart}
            onExtendRange={onExtendRange}
            startDateExpression={startDateExpression}
            endDateExpression={endDateExpression}
          />
        )}
      </LoadingItemViewExtra>
    );

    return (
      <ProgressEntryWrapper className={className} position={position}>
        {position === 'start' ? extra : null}
        <ProgressMessage timestamp={timestamp} position={position} isStreaming={isStreaming} />
        {position === 'end' ? extra : null}
      </ProgressEntryWrapper>
    );
  }
}

const LoadingItemViewExtra = styled(EuiFlexGroup)`
  height: 40px;
`;

const ProgressEntryWrapper = styled.div<{ position: Position }>`
  padding-left: ${(props) => props.theme.euiTheme.size.s};
  padding-top: ${(props) =>
    props.position === 'start' ? props.theme.euiTheme.size.l : props.theme.euiTheme.size.m};
  padding-bottom: ${(props) =>
    props.position === 'end' ? props.theme.euiTheme.size.l : props.theme.euiTheme.size.m};
`;

type ProgressMessageProps = Pick<
  LogTextStreamLoadingItemViewProps,
  'timestamp' | 'position' | 'isStreaming'
>;
const ProgressMessage: React.FC<ProgressMessageProps> = ({ timestamp, position, isStreaming }) => {
  const formattedTimestamp =
    isStreaming && position === 'end' ? (
      <FormattedRelative value={timestamp} updateIntervalInSeconds={1} />
    ) : (
      <FormattedTime value={timestamp} {...TIMESTAMP_FORMAT} />
    );

  const message =
    position === 'start' ? (
      <FormattedMessage
        id="xpack.logsShared.logs.showingEntriesFromTimestamp"
        defaultMessage="Showing entries from {timestamp}"
        values={{ timestamp: formattedTimestamp }}
      />
    ) : isStreaming ? (
      <FormattedMessage
        id="xpack.logsShared.logs.lastUpdate"
        defaultMessage="Last update {timestamp}"
        values={{ timestamp: formattedTimestamp }}
      />
    ) : (
      <FormattedMessage
        id="xpack.logsShared.logs.showingEntriesUntilTimestamp"
        defaultMessage="Showing entries until {timestamp}"
        values={{ timestamp: formattedTimestamp }}
      />
    );

  return (
    <LogTextSeparator>
      <EuiTitle size="xxs">{message}</EuiTitle>
    </LogTextSeparator>
  );
};

const ProgressSpinner: React.FC<{ kind: 'streaming' | 'loading' }> = ({ kind }) => (
  <>
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="l" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">
        {kind === 'streaming' ? (
          <FormattedMessage
            id="xpack.logsShared.logs.streamingNewEntriesText"
            defaultMessage="Streaming new entries"
          />
        ) : (
          <FormattedMessage
            id="xpack.logsShared.logs.loadingNewEntriesText"
            defaultMessage="Loading new entries"
          />
        )}
      </EuiText>
    </EuiFlexItem>
  </>
);

type ProgressCtaProps = Pick<
  LogTextStreamLoadingItemViewProps,
  'position' | 'startDateExpression' | 'endDateExpression' | 'onExtendRange' | 'onStreamStart'
>;
const ProgressCta: React.FC<ProgressCtaProps> = ({
  position,
  startDateExpression,
  endDateExpression,
  onExtendRange,
  onStreamStart,
}) => {
  const rangeEdge = position === 'start' ? startDateExpression : endDateExpression;

  if (rangeEdge === 'now' && position === 'end') {
    return (
      <div role="cell">
        <EuiButton
          data-test-subj="infraProgressCtaStreamLiveButton"
          onClick={onStreamStart}
          size="s"
        >
          <FormattedMessage id="xpack.logsShared.logs.streamLive" defaultMessage="Stream live" />
        </EuiButton>
      </div>
    );
  }

  const iconType = position === 'start' ? 'arrowUp' : 'arrowDown';
  const extendedRange =
    position === 'start'
      ? extendDatemath(startDateExpression, 'before', endDateExpression)
      : extendDatemath(endDateExpression, 'after', startDateExpression);
  if (!extendedRange || !('diffUnit' in extendedRange)) {
    return null;
  }

  return (
    <div role="cell">
      <EuiButton
        data-test-subj="infraProgressCtaButton"
        onClick={() => {
          if (typeof onExtendRange === 'function') {
            onExtendRange(extendedRange.value);
          }
        }}
        iconType={iconType}
        size="s"
      >
        <ProgressExtendMessage amount={extendedRange.diffAmount} unit={extendedRange.diffUnit} />
      </EuiButton>
    </div>
  );
};

const ProgressExtendMessage: React.FC<{ amount: number; unit: Unit }> = ({ amount, unit }) => {
  switch (unit) {
    case 'ms':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByMillisecondsButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {millisecond} other {milliseconds}}"
          values={{ amount }}
        />
      );
    case 's':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeBySecondsButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {second} other {seconds}}"
          values={{ amount }}
        />
      );
    case 'm':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByMinutesButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {minute} other {minutes}}"
          values={{ amount }}
        />
      );
    case 'h':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByHoursButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {hour} other {hours}}"
          values={{ amount }}
        />
      );
    case 'd':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByDaysButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {day} other {days}}"
          values={{ amount }}
        />
      );
    case 'w':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByWeeksButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {week} other {weeks}}"
          values={{ amount }}
        />
      );
    case 'M':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByMonthsButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {month} other {months}}"
          values={{ amount }}
        />
      );
    case 'y':
      return (
        <FormattedMessage
          id="xpack.logsShared.logs.extendTimeframeByYearsButton"
          defaultMessage="Extend time frame by {amount, number} {amount, plural, one {year} other {years}}"
          values={{ amount }}
        />
      );
    default:
      throw new TypeError('Unhandled unit: ' + unit);
  }
};
