import { useEffect, useState } from 'react';

import { Row, Screen } from '@/components/screen';
import { Avatar } from '@/components/social';
import { Button, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { type PublicProfile, profilesByIds, setBlocked } from '@/lib/social';
import { useSocial } from '@/lib/social-store';

/** Settings › Blocked accounts: everyone you blocked, with Unblock. */
export default function Blocked() {
  const { userId, blocked } = useSocial();
  const [people, setPeople] = useState<PublicProfile[]>([]);
  useEffect(() => { profilesByIds(blocked).then(setPeople).catch(() => {}); }, [blocked.join()]);
  return (
    <Screen edges={[]} bg={Colors.surface}>
      <T variant="h2">Blocked accounts</T>
      {!blocked.length && <T variant="muted">You haven't blocked anyone.</T>}
      {people.filter((p) => blocked.includes(p.id)).map((p) => (
        <Row key={p.id} style={{ flexWrap: 'nowrap' }}>
          <Avatar p={p} />
          <T style={{ flex: 1, fontWeight: '700' }}>@{p.handle}</T>
          <Button title="Unblock" onPress={() => userId && setBlocked(userId, p.id, false).catch(() => {})} />
        </Row>
      ))}
    </Screen>
  );
}
