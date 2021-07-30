# Garbage schedule data scraper - API service

Following project converts the [Ragn-Sells](https://ragnsells.ee/klienditugi/graafikud) schedule information from HTML to JSON API.

Running server:

```
yarn build
TOKEN_CONFIG='{"xxx":{"region":"123","address":"Kuku 54"}}' node build/index.js
```

## Usage

There is only a single endpoint which accepts the query parameter `token`:

`GET https://example.com/?token=xxx`

```json
[
  {
    "region": "Rakvere linn, Lääne-Viru maakond",
    "house": "Tihase 51",
    "frequency_in_days": 28,
    "next_visit_day": "2021-08-16T00:00:00.000Z",
    "service_type": "olmeprügi"
  }
]
```

## Home assistant side setup

The following config should be used for Home assistant, this would register the "garbage schedule" as a rest sensor which polls the site and scrapes the information.

```yaml
sensor:
  - platform: rest
    name: garbage_schedule
    json_attributes_path: '$.[0]'
    json_attributes:
      - frequency_in_days
      - house
      - next_visit_day
      - region
      - service_type
    value_template: '{{ value_json[0].house }}'
    scan_interval: 600
    resource: !secret garbage_schedule_host

  - platform: template
    sensors:
      garbage_pickup_alert_one_day:
        icon_template: mdi:alert-octagon
        value_template: >
          {{ (as_timestamp(state_attr('sensor.garbage_schedule', 'next_visit_day')) | default(0) - as_timestamp(now())) | int < (24 * 60 * 60) }}

      until_next_garbage_pickup:
        icon_template: mdi:thumb-up
        value_template: >
          {{ (as_timestamp(state_attr('sensor.garbage_schedule', 'next_visit_day')) - as_timestamp(now())) | int }}

automation:
  - id: until_next_garbage_pickup_update
    alias: 'Update next garbage pickup count down sensor'
    trigger:
      - platform: time_pattern
        minutes: '/15'
    action:
      - service: homeassistant.update_entity
        data:
          entity_id: sensor.until_next_garbage_pickup
      - service: homeassistant.update_entity
        data:
          entity_id: sensor.garbage_pickup_alert_one_day

  - id: garbage_pickup_day_before_notification
    alias: 'Garbage pickup notification day before'
    trigger:
      entity_id: sensor.garbage_pickup_alert_one_day
      platform: state
      to: 'True'
    condition:
      - condition: template # only notify once every 5 five hours at most
        value_template: "{{ ( as_timestamp(now()) - as_timestamp(state_attr('garbage_pickup_day_before_notification', 'last_triggered')) |int(0) ) > 5 * 3600 }}"
    # - condition: state
    #   entity_id: input_boolean.dnd
    #   state: "off"
    action:
      - service: notify.webos_tv
        data:
          message: 'Prügi ära unusta!'
      - service: persistent_notification.create
        data:
          title: 'Prügi välja'
          message: 'Prügi järgi!'
```

## License

MIT
