constant ONE_SECOND = $3e8
constant ONE_MINUTE = $ea60
constant erase = $ff00
constant bold = $f100
constant regular = $f200
constant background_char = $2588
constant player_char = $40
constant screen_width = $20
constant screen_start = $3000
constant screen_length = $200

structure Vector {
  x: $2,
  y: $2
}

animate_player:
inc r4
mov &[<Vector> player_position.x], r5
inc r5
mov r5, &[<Vector> player_position.x]
mov &[<Vector> player_position.y], r5
dec r5
mov r5, &[<Vector> player_position.y]
psh $0
cal [!draw]
mov r4, acc
slp $3c
jne $0f, &[!animate_player]
jmp &[!end]

draw:
draw_background:
mov [!erase], &[!screen_start]
mov [!screen_start], r1
loop:
mov [!background_char], &(r1)
inc r1
mov r1, acc
jne [!screen_start + !screen_length], &[!loop]

draw_player:
mov &[<Vector> player_position.x], r2
mov &[<Vector> player_position.y], r3
mul [!screen_width], r3
add acc, r2
add [!screen_start], acc
mov [!player_char], &(acc)
ret

end:
mov $00, &[!screen_start + !screen_length - $1]
hlt
data16 player_position = { $0, $f }