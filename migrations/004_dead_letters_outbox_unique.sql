-- One open dead letter per outbox row. A crash after INSERT and before
-- outbox.completed_at must not create a second open row on lease reclaim.
-- replayed_at IS NOT NULL drops the row out of this index so a later failure can insert again.
CREATE UNIQUE INDEX dead_letters_open_outbox_uidx
  ON dead_letters (outbox_id)
  WHERE replayed_at IS NULL;
