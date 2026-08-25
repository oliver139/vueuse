https://github.com/vueuse/vueuse/issues/3778

Problem

1. Can set null in `<script>` but not `<template>`
2. `RemovableRef` should not be ok to set `null`
   - `Ref<T | null | undefined>` will have compatibility issue
3. `reset()` function wanted
4. Maybe `clear()` function too?
5. `Remove storage and read default`(v) vs `Write default to storage` (Refer to `refDefault`)

Solution

1. `preserveDefault` key
2. Introduce `reset()` and `clear()`
3. v15 stop clear storage with assign `null`
