import { AppHeader } from "@/components/app-header";
import { EventCard } from "@/components/event-card";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useContent } from "@/features/content/content-provider";
import { selectSetlistForEvent } from "@/features/content/selectors";
import { useLocalSearchParams } from "expo-router";

export default function WorshipDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { content, error, loading, refresh } = useContent();
  if (loading && !content) return <Screen><LoadingState /></Screen>;
  if (error && !content) return <Screen><ErrorState message={error} retry={() => void refresh()} /></Screen>;

  const event = content?.events.find((candidate) => candidate.slug === slug) ?? null;
  if (!content || !event) {
    return (
      <Screen>
        <AppHeader title="예배 상세" back />
        <EmptyState title="예배를 찾을 수 없습니다" description="공개 상태가 변경됐거나 잘못된 링크입니다." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="예배 상세" back notifications />
      <EventCard
        event={event}
        setlist={selectSetlistForEvent(content.setlists, event.id)}
        naverMapUrl={content.site.naver_map_url}
        kakaoMapUrl={content.site.kakao_map_url}
        showShare
      />
    </Screen>
  );
}
